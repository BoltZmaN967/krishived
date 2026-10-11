
import os
import io
import gc
import base64

import torch
import torch.nn as nn
import torch.nn.functional as F

from torchvision import transforms
from PIL import Image
import numpy as np
import cv2


# ============================================================
# 1. CNN ARCHITECTURE
# Must match the architecture used to train the saved model.
# ============================================================

class CNN(nn.Module):
    def __init__(self, num_classes=4):
        super().__init__()

        self.features = nn.Sequential(
            nn.Conv2d(3, 32, kernel_size=3, padding=1),
            nn.ReLU(inplace=False),
            nn.MaxPool2d(kernel_size=2, stride=2),

            nn.Conv2d(32, 64, kernel_size=3, padding=1),
            nn.ReLU(inplace=False),
            nn.MaxPool2d(kernel_size=2, stride=2),

            nn.Conv2d(64, 128, kernel_size=3, padding=1),
            nn.ReLU(inplace=False),
            nn.MaxPool2d(kernel_size=2, stride=2),

            nn.Conv2d(128, 256, kernel_size=3, padding=1),
            nn.ReLU(inplace=False),
            nn.MaxPool2d(kernel_size=2, stride=2),
        )

        self.classifier = nn.Sequential(
            nn.Linear(256 * 14 * 14, 512),
            nn.ReLU(inplace=False),
            nn.Dropout(0.5),

            nn.Linear(512, 256),
            nn.ReLU(inplace=False),
            nn.Dropout(0.5),

            nn.Linear(256, num_classes)
        )

    def forward(self, x):
        x = self.features(x)
        x = x.reshape(x.size(0), -1)
        return self.classifier(x)


# ============================================================
# 2. CLASS NAMES
# Keep this order identical to the training label mapping.
# ============================================================

CLASS_NAMES = [
    "bacterial_blight",
    "curl_virus",
    "fussarium_wilt",
    "healthy"
]


# ============================================================
# 3. CLASS METADATA
# ============================================================

CLASS_METADATA = {
    "bacterial_blight": {
        "display_name": "Bacterial Blight (Xanthomonas)",
        "class_id": "bacterial_blight",
        "is_healthy": False,
        "requires_expert_review": False,
        "evidence": [
            "Water-soaked angular leaf spots bounded by small veinlets",
            "Grad-CAM highlights regions influencing the model prediction",
            "Chlorotic halo margins may occur around bacterial lesions"
        ],
        "next_action": (
            "Seek local agricultural expert guidance before applying "
            "treatment. Confirm the disease and follow locally approved "
            "plant-protection recommendations."
        )
    },

    "curl_virus": {
        "display_name": "Cotton Leaf Curl Virus (CLCuV)",
        "class_id": "curl_virus",
        "is_healthy": False,
        "requires_expert_review": True,
        "evidence": [
            "Leaf margin curling may be associated with infection",
            "Grad-CAM highlights image regions influencing the prediction",
            "Whiteflies may transmit cotton leaf curl viruses"
        ],
        "next_action": (
            "Arrange expert confirmation. Inspect for whiteflies and "
            "follow locally approved integrated pest management guidance."
        )
    },

    "fussarium_wilt": {
        "display_name": "Fusarium Wilt (Fusarium oxysporum)",
        "class_id": "fussarium_wilt",
        "is_healthy": False,
        "requires_expert_review": True,
        "evidence": [
            "Yellowing or wilting may be associated with plant stress",
            "Grad-CAM highlights image regions influencing the prediction",
            "Leaf symptoms alone cannot confirm Fusarium infection"
        ],
        "next_action": (
            "Request agricultural expert confirmation before treatment. "
            "Inspect root and stem symptoms, and assess field drainage."
        )
    },

    "healthy": {
        "display_name": "Healthy Plant",
        "class_id": "healthy",
        "is_healthy": True,
        "requires_expert_review": False,
        "evidence": [
            "The model classified the leaf image as healthy",
            "Grad-CAM highlights regions influencing the prediction",
            "Visual inspection is still needed to rule out other problems"
        ],
        "next_action": (
            "Continue routine crop monitoring, appropriate irrigation, "
            "and recommended crop-management practices."
        )
    }
}


# ============================================================
# 4. GRAD-CAM
# ============================================================

class GradCAM:
    def __init__(self, model, target_layer):
        self.model = model
        self.target_layer = target_layer
        self.activations = None
        self.hook = self.target_layer.register_forward_hook(
            self._forward_hook
        )

    def _forward_hook(self, module, inputs, output):
        self.activations = output

    def generate(self, input_tensor, class_idx=None):
        self.model.eval()
        self.activations = None

        try:
            # Grad-CAM requires gradients.
            # Do not call this method under torch.no_grad()
            # or torch.inference_mode().
            with torch.enable_grad():
                x = input_tensor.detach().requires_grad_(True)

                output = self.model(x)

                if self.activations is None:
                    raise RuntimeError(
                        "Grad-CAM target layer produced no activations."
                    )

                if class_idx is None:
                    target_class = int(
                        output[0].argmax().item()
                    )
                else:
                    target_class = int(class_idx)

                if not 0 <= target_class < output.shape[1]:
                    raise ValueError(
                        f"Invalid Grad-CAM class index: {target_class}"
                    )

                # Calculate gradients of the selected class score.
                gradients = torch.autograd.grad(
                    outputs=output[0, target_class],
                    inputs=self.activations,
                    retain_graph=False,
                    create_graph=False
                )[0]

                # Average gradients spatially to get channel weights.
                weights = gradients.mean(
                    dim=(2, 3),
                    keepdim=True
                )

                # Weighted sum of feature maps.
                cam = torch.relu(
                    (weights * self.activations).sum(dim=1)
                )[0]

                cam = cam.detach()

                # Min-max normalization.
                cam_min = cam.min()
                cam_max = cam.max()
                cam_range = (cam_max - cam_min).item()

                if cam_range > 1e-8:
                    cam = (cam - cam_min) / (cam_max - cam_min)
                else:
                    print(
                        "[Grad-CAM WARNING] Activation map is constant "
                        "or all zero for this target layer."
                    )
                    cam = torch.zeros_like(cam)

                cam_np = cam.cpu().numpy()

                # Diagnostic information.
                print(
                    f"[Grad-CAM] Class index: {target_class}"
                )
                print(
                    f"[Grad-CAM] Shape: {cam_np.shape}"
                )
                print(
                    f"[Grad-CAM] Min: {cam_np.min():.6f}, "
                    f"Max: {cam_np.max():.6f}, "
                    f"Mean: {cam_np.mean():.6f}"
                )
                print(
                    f"[Grad-CAM] Nonzero pixels: "
                    f"{np.count_nonzero(cam_np)}/{cam_np.size}"
                )

                return cam_np, output.detach().cpu()

        finally:
            self.activations = None

    def close(self):
        # Remove the hook when this object is no longer needed.
        self.hook.remove()


# ============================================================
# 5. PLANT DISEASE DETECTOR
# ============================================================

class PlantDiseaseDetector:
    _instance = None

    @classmethod
    def get_instance(cls, model_path=None):
        if cls._instance is None:
            cls._instance = cls(model_path)
        return cls._instance

    def __init__(self, model_path=None):

        if model_path is None:
            base_dir = os.path.dirname(
                os.path.dirname(os.path.abspath(__file__))
            )

            model_path = os.path.join(
                base_dir,
                "models",
                "best_cnn_model.pth"
            )

        torch.set_num_threads(1)
        self.device = torch.device("cpu")

        self.model = CNN(num_classes=4).to(self.device)

        if not os.path.isfile(model_path):
            raise FileNotFoundError(
                f"Model file not found: {model_path}"
            )

        print(f"[MODEL] Loading: {model_path}")

        try:
            state_dict = torch.load(
                model_path,
                map_location=self.device,
                weights_only=True
            )
        except TypeError:
            # Compatibility with older PyTorch versions.
            state_dict = torch.load(
                model_path,
                map_location=self.device
            )

        self.model.load_state_dict(state_dict)
        del state_dict
        gc.collect()

        self.model.eval()

        print("[MODEL] Loaded successfully.")

        # Use the fourth convolution's ReLU output.
        # features[9] is the Conv2d layer; features[10] is its ReLU.
        self.grad_cam = GradCAM(
            self.model,
            self.model.features[10]
        )

        # Must match the preprocessing used during training.
        self.transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(
                (0.5, 0.5, 0.5),
                (0.5, 0.5, 0.5)
            )
        ])

    # --------------------------------------------------------
    # Convert a NumPy RGB image to a Base64 JPEG data URL.
    # --------------------------------------------------------

    @staticmethod
    def _image_to_base64(image_array, quality=90):
        image_array = np.asarray(image_array)

        if image_array.dtype != np.uint8:
            image_array = np.clip(
                image_array, 0, 255
            ).astype(np.uint8)

        image = Image.fromarray(image_array).convert("RGB")

        buffer = io.BytesIO()
        image.save(buffer, format="JPEG", quality=quality)

        encoded = base64.b64encode(
            buffer.getvalue()
        ).decode("utf-8")

        return "data:image/jpeg;base64," + encoded

    # --------------------------------------------------------
    # Prediction + Grad-CAM visualizations.
    # --------------------------------------------------------

    def predict(self, image_bytes_or_pil):

        # 1. Load image.
        if isinstance(image_bytes_or_pil, (bytes, bytearray)):
            orig_pil = Image.open(
                io.BytesIO(image_bytes_or_pil)
            ).convert("RGB")

        elif isinstance(image_bytes_or_pil, Image.Image):
            orig_pil = image_bytes_or_pil.convert("RGB")

        else:
            raise ValueError(
                "Input must be image bytes or a PIL Image."
            )

        orig_w, orig_h = orig_pil.size

        if orig_w == 0 or orig_h == 0:
            raise ValueError("Uploaded image has invalid dimensions.")

        # 2. Prepare model input.
        input_tensor = self.transform(
            orig_pil
        ).unsqueeze(0).to(self.device)

        # 3. Generate Grad-CAM and prediction logits.
        cam_map, logits = self.grad_cam.generate(input_tensor)

        # 4. Calculate prediction probabilities.
        probs = F.softmax(logits, dim=1).numpy()[0]

        pred_idx = int(np.argmax(probs))
        confidence = float(probs[pred_idx])

        class_name = CLASS_NAMES[pred_idx]
        meta = CLASS_METADATA[class_name]

        all_class_scores = {
            CLASS_NAMES[i]: float(probs[i])
            for i in range(len(CLASS_NAMES))
        }

        # 5. Resize CAM to the original image dimensions.
        cam_resized = cv2.resize(
            cam_map,
            (orig_w, orig_h),
            interpolation=cv2.INTER_LINEAR
        )

        # Normalize again after resizing.
        cam_min = float(cam_resized.min())
        cam_max = float(cam_resized.max())

        if cam_max - cam_min > 1e-8:
            cam_resized = (
                (cam_resized - cam_min) /
                (cam_max - cam_min)
            )
        else:
            cam_resized = np.zeros_like(cam_resized)

        cam_resized = np.clip(
            cam_resized, 0.0, 1.0
        ).astype(np.float32)

        # 6. Create a colored heatmap.
        heatmap_uint8 = np.uint8(
            cam_resized * 255
        )

        heatmap_bgr = cv2.applyColorMap(
            heatmap_uint8,
            cv2.COLORMAP_JET
        )

        heatmap_rgb = cv2.cvtColor(
            heatmap_bgr,
            cv2.COLOR_BGR2RGB
        )

        # 7. Blend the heatmap with the original image.
        orig_np = np.asarray(orig_pil).astype(np.float32)

        # Use CAM intensity as the blending alpha.
        alpha = (
            0.45 * cam_resized[..., np.newaxis]
        )

        blended = (
            (1.0 - alpha) * orig_np
            + alpha * heatmap_rgb.astype(np.float32)
        )

        blended = np.clip(
            blended, 0, 255
        ).astype(np.uint8)

        # 8. Encode both images.
        gradcam_base64 = self._image_to_base64(
            blended
        )

        raw_heatmap_base64 = self._image_to_base64(
            heatmap_rgb
        )

        # Release temporary tensors.
        del input_tensor, logits, cam_map
        gc.collect()

        # 9. Return fields expected by the frontend.
        result = {
            "prediction": meta["display_name"],
            "raw_class": class_name,
            "class_id": meta["class_id"],
            "confidence": round(confidence, 4),
            "is_healthy": meta["is_healthy"],
            "requires_expert_review": (
                meta["requires_expert_review"]
            ),
            "evidence": meta["evidence"],
            "next_action": meta["next_action"],
            "all_scores": all_class_scores,

            # Both values are complete data URLs.
            "gradcam_image_base64": gradcam_base64,
            "raw_heatmap_base64": raw_heatmap_base64,

            "model_type": (
                "KrishiVed Custom CNN with Grad-CAM"
            )
        }

        print(
            f"[ML OUTPUT] Prediction: {meta['display_name']} "
            f"| Class: {class_name} "
            f"| Confidence: {confidence * 100:.2f}%",
            flush=True
        )
        print(
            "[PREDICTION] Grad-CAM images generated successfully."
        )

        return result
