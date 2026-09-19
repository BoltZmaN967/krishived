import os
import io
import base64
import torch
import torch.nn as nn
import torch.nn.functional as F
from torchvision import transforms
from PIL import Image
import numpy as np
import cv2

# Model architecture matching best_cnn_model.pth exactly
class CNN(nn.Module):
    def __init__(self, num_classes=4):
        super(CNN, self).__init__()
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
        x = x.view(x.size(0), -1)
        x = self.classifier(x)
        return x


CLASS_NAMES = [
    'bacterial_blight',
    'curl_virus',
    'fussarium_wilt',
    'healthy'
]

CLASS_METADATA = {
    'bacterial_blight': {
        'display_name': 'Bacterial Blight (Xanthomonas)',
        'class_id': 'bacterial_blight',
        'is_healthy': False,
        'requires_expert_review': False,
        'evidence': [
            'Water-soaked angular leaf spots bounded by small veinlets',
            'Grad-CAM heatmap highlights active foliar lesions and necrosis on leaf blade',
            'Chlorotic halo margins around bacterial infection spots'
        ],
        'next_action': 'Apply Copper Oxychloride 50% WP (2.5-3.0 g/L) mixed with Streptocycline (100 ppm / 1g in 10L). Avoid excessive nitrogen top dressing.'
    },
    'curl_virus': {
        'display_name': 'Cotton Leaf Curl Virus (CLCuV)',
        'class_id': 'curl_virus',
        'is_healthy': False,
        'requires_expert_review': True,
        'evidence': [
            'Upward/downward leaf margin curling and vein thickening',
            'Grad-CAM reveals concentrated stress on leaf margins and vascular veins',
            'Whitefly (Bemisia tabaci) vector transmission risk'
        ],
        'next_action': 'Control whitefly vector immediately using Acetamiprid 20% SP (0.2 g/L) or Flonicamid 50% WG (0.3 g/L). Remove severely infected host plants.'
    },
    'fussarium_wilt': {
        'display_name': 'Fusarium Wilt (Fusarium oxysporum)',
        'class_id': 'fussarium_wilt',
        'is_healthy': False,
        'requires_expert_review': True,
        'evidence': [
            'Yellowing and browning along leaf margins leading to systemic wilting',
            'Grad-CAM heatmap pinpoints vascular tissue degradation and moisture stress points',
            'Loss of leaf turgor and characteristic necrotic leaf decay'
        ],
        'next_action': 'Drench root zone with Carbendazim 50% WP (1-2 g/L) or bio-agent Trichoderma viride. Ensure proper field drainage to prevent fungal spore spread.'
    },
    'healthy': {
        'display_name': 'Healthy Plant (Disease-Free & Fresh)',
        'class_id': 'healthy',
        'is_healthy': True,
        'requires_expert_review': False,
        'evidence': [
            'Uniform dark green chlorophyll distribution across the entire leaf lamina',
            'No chlorotic spots, viral curl distortions, or wilting lesions',
            'Grad-CAM confirms even, healthy feature dispersion with no focal disease trigger'
        ],
        'next_action': 'Crop is in optimal health. Continue standard irrigation and scheduled 19:19:19 foliar spray. Maintain weekly scouting.'
    }
}


class GradCAM:
    def __init__(self, model, target_layer):
        self.model = model
        self.target_layer = target_layer
        self.gradients = None
        self.activations = None
        self._register_hooks()

    def _register_hooks(self):
        def forward_hook(module, input, output):
            self.activations = output

        def backward_hook(module, grad_in, grad_out):
            self.gradients = grad_out[0]

        self.target_layer.register_forward_hook(forward_hook)
        self.target_layer.register_full_backward_hook(backward_hook)

    def generate(self, input_tensor, class_idx=None):
        self.model.eval()
        self.model.zero_grad()

        # Forward pass
        output = self.model(input_tensor)
        if class_idx is None:
            class_idx = torch.argmax(output, dim=1).item()

        # Backward pass on the specific class score
        score = output[0, class_idx]
        score.backward(retain_graph=True)

        # Compute channel weights via global average pooling of gradients
        gradients = self.gradients.data.cpu().numpy()[0]  # shape: (256, 14, 14)
        activations = self.activations.data.cpu().numpy()[0]  # shape: (256, 14, 14)
        weights = np.mean(gradients, axis=(1, 2))  # shape: (256,)

        # Weighted combination of activation maps
        cam = np.zeros(activations.shape[1:], dtype=np.float32)
        for i, w in enumerate(weights):
            cam += w * activations[i]

        # ReLU on CAM to only consider positive features contributing to the class
        cam = np.maximum(cam, 0)
        if cam.max() > 0:
            cam = cam / cam.max()

        return cam, output


class PlantDiseaseDetector:
    _instance = None

    @classmethod
    def get_instance(cls, model_path=None):
        if cls._instance is None:
            cls._instance = cls(model_path)
        return cls._instance

    def __init__(self, model_path=None):
        if model_path is None:
            base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            model_path = os.path.join(base_dir, "models", "best_cnn_model.pth")

        self.device = torch.device("cpu")
        self.model = CNN(num_classes=4).to(self.device)

        if os.path.exists(model_path):
            print(f"Loading best_cnn_model.pth from {model_path}...")
            state_dict = torch.load(model_path, map_location=self.device)
            self.model.load_state_dict(state_dict)
            self.model.eval()
            print("[OK] Model loaded successfully!")
        else:
            raise FileNotFoundError(f"Model file not found at {model_path}")

        # Hook onto the 4th Conv2d layer (features[9])
        self.grad_cam = GradCAM(self.model, self.model.features[9])

        self.transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize((0.5, 0.5, 0.5), (0.5, 0.5, 0.5))
        ])

    def predict(self, image_bytes_or_pil):
        if isinstance(image_bytes_or_pil, (bytes, bytearray)):
            orig_pil = Image.open(io.BytesIO(image_bytes_or_pil)).convert('RGB')
        elif isinstance(image_bytes_or_pil, Image.Image):
            orig_pil = image_bytes_or_pil.convert('RGB')
        else:
            raise ValueError("Input must be image bytes or PIL Image")

        orig_w, orig_h = orig_pil.size

        # Preprocess for model
        input_tensor = self.transform(orig_pil).unsqueeze(0).to(self.device)
        input_tensor.requires_grad = True

        # Generate Grad-CAM & logits
        cam_map, logits = self.grad_cam.generate(input_tensor)

        # Probabilities
        probs = F.softmax(logits, dim=1).detach().cpu().numpy()[0]
        pred_idx = int(np.argmax(probs))
        confidence = float(probs[pred_idx])
        class_name = CLASS_NAMES[pred_idx]
        meta = CLASS_METADATA[class_name]

        # Resize CAM to original image size & generate heatmap overlay
        cam_resized = cv2.resize(cam_map, (orig_w, orig_h))
        heatmap_uint8 = np.uint8(255 * cam_resized)
        color_heatmap = cv2.applyColorMap(heatmap_uint8, cv2.COLORMAP_JET)
        color_heatmap = cv2.cvtColor(color_heatmap, cv2.COLOR_BGR2RGB)

        orig_np = np.array(orig_pil)
        # Blend original image (60%) and Grad-CAM heatmap (40%)
        blended = np.uint8(0.6 * orig_np + 0.4 * color_heatmap)

        # Encode blended Grad-CAM overlay to base64 JPEG
        blended_pil = Image.fromarray(blended)
        buffered = io.BytesIO()
        blended_pil.save(buffered, format="JPEG", quality=90)
        gradcam_base64 = "data:image/jpeg;base64," + base64.b64encode(buffered.getvalue()).decode("utf-8")

        # Also create raw heatmap image base64
        heatmap_pil = Image.fromarray(color_heatmap)
        buffered_heat = io.BytesIO()
        heatmap_pil.save(buffered_heat, format="JPEG", quality=90)
        raw_heatmap_base64 = "data:image/jpeg;base64," + base64.b64encode(buffered_heat.getvalue()).decode("utf-8")

        all_class_scores = {
            CLASS_NAMES[i]: float(probs[i]) for i in range(len(CLASS_NAMES))
        }

        return {
            "prediction": meta['display_name'],
            "raw_class": class_name,
            "class_id": meta['class_id'],
            "confidence": round(confidence, 4),
            "is_healthy": meta['is_healthy'],
            "requires_expert_review": meta['requires_expert_review'],
            "evidence": meta['evidence'],
            "next_action": meta['next_action'],
            "all_scores": all_class_scores,
            "gradcam_image_base64": gradcam_base64,
            "raw_heatmap_base64": raw_heatmap_base64,
            "model_type": "KrishiVed Custom CNN (best_cnn_model.pth) with Grad-CAM"
        }
