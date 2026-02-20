"""
Script pour tester l'API DeepGuard
"""

import requests
from pathlib import Path

# URL de l'API
API_URL = "http://localhost:8000"


def test_root():
    """Test endpoint root"""
    print("\n1️⃣ Test ROOT endpoint...")
    response = requests.get(f"{API_URL}/")
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")
    assert response.status_code == 200


def test_health():
    """Test health check"""
    print("\n2️⃣ Test HEALTH endpoint...")
    response = requests.get(f"{API_URL}/health")
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")
    assert response.status_code == 200
    assert response.json()['status'] == 'healthy'


def test_info():
    """Test model info"""
    print("\n3️⃣ Test INFO endpoint...")
    response = requests.get(f"{API_URL}/info")
    print(f"Status: {response.status_code}")
    data = response.json()
    print(f"Model: {data['model']['architecture']}")
    print(f"Accuracy: {data['model']['performance']['test_accuracy']}%")
    assert response.status_code == 200


def test_predict(image_path):
    """Test prédiction sur une image"""
    print(f"\n4️⃣ Test PREDICT endpoint avec {image_path}...")
    
    if not Path(image_path).exists():
        print(f"❌ Image non trouvée : {image_path}")
        return
    
    # Envoyer l'image
    with open(image_path, 'rb') as f:
        files = {'file': (Path(image_path).name, f, 'image/jpeg')}
        response = requests.post(f"{API_URL}/predict", files=files)
    
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        print(f"\n📊 Résultat :")
        print(f"   Prédiction : {result['prediction']}")
        print(f"   Deepfake : {'OUI' if result['is_deepfake'] else 'NON'}")
        print(f"   Confidence : {result['confidence']*100:.2f}%")
        print(f"   Probabilités :")
        print(f"      - Real : {result['probabilities']['real']*100:.2f}%")
        print(f"      - Fake : {result['probabilities']['fake']*100:.2f}%")
        print(f"   Temps : {result['processing_time_ms']:.2f} ms")
    else:
        print(f"❌ Erreur : {response.text}")


if __name__ == "__main__":
    print("="*60)
    print("🧪 TEST DE L'API DEEPGUARD")
    print("="*60)
    
    try:
        # Tests de base
        test_root()
        test_health()
        test_info()
        
        # Test avec une image (à adapter)
        # Tu devras mettre le chemin vers une image de test
        # test_predict("path/to/test_image.jpg")
        
        print("\n" + "="*60)
        print("✅ TOUS LES TESTS PASSÉS !")
        print("="*60)
        
    except Exception as e:
        print(f"\n❌ ERREUR : {e}")