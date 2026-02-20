"""
Tests avancés pour l'API DeepGuard
"""

import requests
import time
from pathlib import Path


API_URL = "http://localhost:8000"


def test_metrics():
    """Test endpoint metrics"""
    print("\n📊 Test METRICS...")
    response = requests.get(f"{API_URL}/metrics")
    print(f"Status: {response.status_code}")
    data = response.json()
    print(f"Total predictions: {data['statistics']['total_predictions']}")
    print(f"Uptime: {data['statistics']['uptime_hours']:.2f} hours")
    print(f"Model accuracy: {data['model']['accuracy']}")


def test_health_detailed():
    """Test health check détaillé"""
    print("\n💚 Test HEALTH détaillé...")
    response = requests.get(f"{API_URL}/health")
    data = response.json()
    print(f"Status: {data['status']}")
    print(f"Memory: {data['system']['memory_mb']} MB")
    print(f"CPU: {data['system']['cpu_percent']}%")


def test_invalid_file():
    """Test avec un fichier invalide"""
    print("\n❌ Test fichier INVALIDE...")
    
    # Créer un faux fichier texte
    fake_file = ("test.txt", b"Not an image", "text/plain")
    
    response = requests.post(
        f"{API_URL}/predict",
        files={'file': fake_file}
    )
    
    print(f"Status: {response.status_code}")
    if response.status_code == 400:
        print("✅ Erreur correctement détectée")
        print(f"Message: {response.json()['detail']}")


def test_batch_prediction(image_paths):
    """Test prédiction batch"""
    print(f"\n📦 Test BATCH PREDICTION ({len(image_paths)} images)...")
    
    files = []
    for path in image_paths:
        if Path(path).exists():
            files.append(
                ('files', (Path(path).name, open(path, 'rb'), 'image/jpeg'))
            )
    
    if not files:
        print("⚠️ Aucune image trouvée pour le test batch")
        return
    
    response = requests.post(f"{API_URL}/predict/batch", files=files)
    
    # Fermer les fichiers
    for _, (_, f, _) in files:
        f.close()
    
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Total: {data['total']}")
        print(f"Success: {data['success']}")
        print(f"Errors: {data['errors']}")
        
        for result in data['results']:
            print(f"  - {result['filename']}: {result['prediction']} ({result['confidence']:.2%})")


def test_performance(image_path, n_requests=10):
    """Test de performance"""
    print(f"\n⚡ Test PERFORMANCE ({n_requests} requêtes)...")
    
    if not Path(image_path).exists():
        print(f"⚠️ Image non trouvée : {image_path}")
        return
    
    times = []
    
    for i in range(n_requests):
        with open(image_path, 'rb') as f:
            files = {'file': (Path(image_path).name, f, 'image/jpeg')}
            
            start = time.time()
            response = requests.post(f"{API_URL}/predict", files=files)
            elapsed = time.time() - start
            
            if response.status_code == 200:
                times.append(elapsed)
    
    if times:
        avg_time = sum(times) / len(times)
        min_time = min(times)
        max_time = max(times)
        
        print(f"✅ {len(times)} requêtes réussies")
        print(f"   Temps moyen: {avg_time*1000:.2f} ms")
        print(f"   Min: {min_time*1000:.2f} ms")
        print(f"   Max: {max_time*1000:.2f} ms")
        print(f"   Débit: {1/avg_time:.2f} req/s")


if __name__ == "__main__":
    print("="*60)
    print("🧪 TESTS AVANCÉS DE L'API DEEPGUARD")
    print("="*60)
    
    try:
        # Tests de base
        test_health_detailed()
        test_metrics()
        test_invalid_file()
        
        # Tests avec images (à adapter selon tes images)
        # test_batch_prediction(['image1.jpg', 'image2.jpg'])
        # test_performance('test_image.jpg', n_requests=10)
        
        print("\n" + "="*60)
        print("✅ TESTS TERMINÉS")
        print("="*60)
        
    except Exception as e:
        print(f"\n❌ ERREUR : {e}")