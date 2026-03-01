/**
 * DeepGuard - Internationalization (i18n) - COMPLETE VERSION
 * Supported languages: EN, FR, ES
 */

const translations = {
    en: {
        // Navigation
        nav_features: "Features",
        nav_performance: "Performance",
        nav_about: "About",
        nav_contact: "Contact",
        nav_try_now: "Try Now →",
        nav_back_home: "← Back to Home",

        // Hero Section
        hero_title_1: "Detect",
        hero_title_2: "Deepfakes",
        hero_title_3: "with AI Precision",
        hero_subtitle: "Advanced ConvNeXt-Base model achieving 98% accuracy with full explainability. Analyze images and videos instantly with Grad-CAM visualizations.",
        hero_stat_accuracy: "Accuracy",
        hero_stat_training: "Training Images",
        hero_stat_inference: "Inference Time",
        hero_btn_try: "Try DeepGuard",
        hero_btn_learn: "Learn More",
        hero_badge_authentic: "AUTHENTIC",
        hero_badge_manipulated: "MANIPULATED",
        hero_bar_authenticity: "Authenticity",
        hero_bar_manipulation: "Manipulation",

        // Features Section
        features_title: "Cutting-Edge Technology",
        feature_convnext_title: "ConvNeXt-Base",
        feature_convnext_desc: "89M parameter state-of-the-art model trained on FaceForensics++ and Celeb-DF datasets",
        feature_gradcam_title: "Grad-CAM Heatmaps",
        feature_gradcam_desc: "Visual explainability showing exactly where the model detects anomalies",
        feature_video_title: "Video Timeline",
        feature_video_desc: "Frame-by-frame analysis with interactive timeline visualization",
        feature_region_title: "Region Detection",
        feature_region_desc: "Automatic identification and highlighting of suspicious facial regions",
        feature_confidence_title: "Confidence Scoring",
        feature_confidence_desc: "Detailed probability distributions with interpretable confidence levels",
        feature_realtime_title: "Real-time Analysis",
        feature_realtime_desc: "Sub-300ms inference time with optimized preprocessing pipeline",

        // Performance Section
        performance_title: "Model Performance",
        performance_subtitle: "Trained and validated on academic benchmark datasets with research-grade metrics",
        metric_accuracy: "Accuracy",
        metric_precision: "Precision",
        metric_recall: "Recall",
        metric_f1: "F1 Score",
        metric_auc: "AUC-ROC",

        // About Section
        about_title: "About DeepGuard",
        about_p1: "DeepGuard is a cutting-edge deepfake detection system built with modern AI techniques. Using a ConvNeXt-Base architecture and trained on 28,000+ professional samples from FaceForensics++ and Celeb-DF datasets, it achieves research-level performance.",
        about_p2: "The system provides full explainability through Grad-CAM visualizations, allowing users to understand exactly why a prediction was made. For videos, frame-by-frame timeline analysis helps identify which portions may have been manipulated.",
        about_role: "Aspiring ML Engineer",
        about_education: "MsC Computer Science & Data Science",

        // Contact Section
        contact_title: "Get in Touch",
        contact_subtitle: "Have feedback, found a bug, or want to suggest a feature? I'd love to hear from you!",
        contact_name: "Name",
        contact_name_placeholder: "Your name",
        contact_email: "Email",
        contact_email_placeholder: "your@email.com",
        contact_subject: "Subject",
        contact_subject_placeholder: "Select a topic...",
        contact_subject_bug: "Bug Report",
        contact_subject_feature: "Feature Request",
        contact_subject_feedback: "General Feedback",
        contact_subject_collab: "Collaboration",
        contact_subject_other: "Other",
        contact_message: "Message",
        contact_message_placeholder: "Tell me more...",
        contact_submit: "Send Message",

        // Footer
        footer_copyright: "© 2025 DeepGuard. Created by Rania AMIL.",

        // App Page
        app_title: "AI Deepfake Detection",
        app_subtitle: "Upload an image or video to analyze for deepfake manipulation with full explainability",
        tab_image: "Image Analysis",
        tab_video: "Video Analysis",

        // Upload Section
        upload_image_title: "Drop an image here or click to browse",
        upload_image_formats: "Supported: JPG, PNG, WebP, BMP • Max 10MB",
        upload_video_title: "Drop a video here or click to browse",
        upload_video_formats: "Supported: MP4, AVI, MOV, WebM, MKV • Max 50MB",
        upload_btn_image: "Choose Image",
        upload_btn_video: "Choose Video",
        upload_or: "OR",
        upload_url_image: "Paste image URL here...",
        upload_url_video: "Paste direct video URL (.mp4, .webm)...",
        upload_load_url: "Load URL",

        // Results
        result_uploaded_image: "Uploaded Image",
        result_uploaded_video: "Uploaded Video",
        result_analysis: "Analysis Result",
        result_reset: "Reset",
        result_analyze_image: "ANALYZE IMAGE",
        result_analyze_video: "ANALYZE VIDEO",
        result_placeholder: "Click \"Analyze\" to start detection",
        result_real: "REAL",
        result_fake: "FAKE",
        result_real_desc: "This image appears to be authentic.",
        result_fake_desc: "Deepfake manipulation detected.",

        // Explainability
        explain_confidence: "Confidence Level",
        explain_probability: "Probability Distribution",
        explain_heatmap: "Attention Heatmap (Grad-CAM)",
        explain_regions: "Suspicious Regions",
        explain_findings: "Key Findings",
        explain_technical: "Technical Analysis",
        explain_recommendation: "Recommendation",
        explain_low_attention: "Low attention",
        explain_high_attention: "High attention",
        explain_prob_real: "Real",
        explain_prob_fake: "Fake",
        explain_position: "Position",
        explain_intensity: "Intensity",

        // Video Timeline
        timeline_title: "Frame-by-Frame Analysis",
        timeline_real: "Real",
        timeline_fake: "Fake",
        timeline_no_face: "No face",
        timeline_frames: "Frames Analyzed",
        timeline_faces: "Faces Detected",
        timeline_fake_pct: "Fake Frames",
        timeline_time: "Processing Time",
        suspicious_title: "Most Suspicious Frames",

        // Model Metrics
        model_title: "Model Performance",
        model_training: "Training Data",

        // How It Works
        how_title: "How DeepGuard Works",
        how_convnext_title: "ConvNeXt-Base Model",
        how_convnext_desc: "89M parameter deep neural network trained on 28,000+ images from FaceForensics++ and Celeb-DF datasets.",
        how_gradcam_title: "Grad-CAM Visualization",
        how_gradcam_desc: "See exactly where the model focuses its attention to make decisions, highlighting suspicious regions.",
        how_multi_title: "Multi-Method Detection",
        how_multi_desc: "Trained to detect Deepfakes, Face2Face, FaceSwap, NeuralTextures, and Celeb-DF manipulation methods.",
        how_confidence_title: "Confidence Scoring",
        how_confidence_desc: "Get detailed probability distributions and confidence levels to understand the reliability of each prediction.",
        how_video_title: "Video Analysis Process",
        how_frame_title: "Frame Extraction",
        how_frame_desc: "Up to 30 frames are sampled from the video to ensure comprehensive coverage while maintaining speed.",
        how_face_title: "Face Detection",
        how_face_desc: "MTCNN detects and extracts faces from each frame for individual analysis.",
        how_timeline_title: "Timeline Analysis",
        how_timeline_desc: "See frame-by-frame predictions visualized on an interactive timeline.",
        how_suspicious_title: "Suspicious Frame Detection",
        how_suspicious_desc: "The most suspicious frames are highlighted for closer inspection.",

        // Limitations
        limitations_title: "Limitations",
        limitation_1: "Works best on frontal faces",
        limitation_2: "May be less accurate on heavily compressed images",
        limitation_3: "Optimized for face manipulation detection",
        limitation_4: "New manipulation techniques may not be detected",

        // Loading
        loading_analyzing: "Analyzing...",
        loading_wait: "This may take a few moments",
        loading_image: "Generating Grad-CAM heatmap and predictions",
        loading_video: "Extracting frames and detecting faces",
        loading_url: "Loading from URL...",
        loading_step_upload: "Uploading file...",
        loading_step_extracting: "Extracting frames...",
        loading_step_faces: "Detecting faces...",
        loading_step_analyzing: "Analyzing frames...",
        loading_step_processing: "Processing image...",
        loading_step_gradcam: "Generating Grad-CAM...",
        loading_step_generating: "Generating results...",
        loading_step_done: "Done!",
        loading_dont_leave: "Please don't close this page",
        loading_almost_there: "Almost there, hang tight...",
        loading_final_steps: "Final steps, just a moment...",

        // Video Info
        video_info: "Video Information",
        video_duration: "Duration",
        video_fps: "FPS",
        video_resolution: "Resolution",

        // Error messages
        error_no_image: "No image selected.",
        error_no_video: "No video selected.",
        error_invalid_url: "Invalid URL format.",
        error_load_image: "Error loading image from URL.",
        error_load_video: "Error loading video from URL.",
        error_analysis_image: "Image analysis error.",
        error_analysis_video: "Video analysis error.",

        // Recommendations - Real
        rec_real_high: "This media appears to be authentic. No signs of AI manipulation were detected.",
        rec_real_medium: "This media appears likely authentic, though some minor ambiguities were detected.",
        rec_real_low: "The model leans toward authenticity but with limited confidence. Manual review recommended.",
        
        // Recommendations - Fake
        rec_fake_high: "Strong indicators of deepfake manipulation detected. We strongly recommend NOT treating this media as authentic.",
        rec_fake_medium: "Significant signs of manipulation were detected. Additional verification is advised.",
        rec_fake_low: "Some anomalies were detected but the result is uncertain. Professional analysis may be needed.",

        // Confidence interpretation (dynamic results)
        conf_very_high: "Very high confidence.",
        conf_high: "High confidence",
        conf_moderate: "Moderate confidence",
        conf_low: "Low confidence.",
        conf_uncertain: "Very uncertain.",
        conf_desc_very_high: "The model is very confident in its prediction.",
        conf_desc_high: "The model is confident in its prediction.",
        conf_desc_moderate: "The model leans toward this prediction but with some uncertainty.",
        conf_desc_low: "The model is uncertain; the result should be interpreted with caution.",
        conf_desc_uncertain: "The model cannot make a reliable determination.",

        // Explanation key points - Fake
        kp_fake_extensive_anomalies: "Extensive anomaly regions detected on the face.",
        kp_fake_suspicious_regions: "suspicious regions identified.",
        kp_fake_high_artifacts: "High concentration of artifacts in certain areas.",
        kp_fake_subtle_patterns: "Subtle manipulation patterns detected.",
        // Explanation key points - Real
        kp_real_no_anomalies: "No significant anomalies detected.",
        kp_real_consistent_texture: "Consistent and natural facial texture.",
        kp_real_authentic: "The image exhibits authentic characteristics.",

        // Technical details - Fake
        td_fake_gan: "GAN compression artifact analysis.",
        td_fake_boundaries: "Detection of inconsistencies at the face boundaries.",
        td_fake_texture: "Verification of skin texture consistency.",
        td_fake_symmetry: "Analysis of micro-expressions and facial symmetry.",
        // Technical details - Real
        td_real_texture: "Verification of texture consistency.",
        td_real_lighting: "Lighting and shadow analysis.",
        td_real_resolution: "Resolution and sharpness check.",
        td_real_proportions: "Validation of facial proportions.",

        // Video interpretation key points
        vi_fake_entire: "Consistent manipulation detected throughout the entire video.",
        vi_fake_majority: "Manipulation detected in the majority of analyzed frames.",
        vi_fake_partial: "Signs of manipulation detected in certain portions of the video.",
        vi_fake_segments: "Suspicious segments identified:",
        vi_real_clean: "No signs of manipulation detected.",
        vi_real_ambiguous: "The video appears authentic despite a few ambiguous frames.",

        // Video confidence levels
        vi_conf_very_high: "Very high confidence",
        vi_conf_high: "High confidence",
        vi_conf_moderate: "Moderate confidence",
        vi_conf_low: "Low confidence",

        // Video recommendations
        vi_rec_fake_high: "This video shows strong indicators of manipulation. We strongly recommend not considering it authentic.",
        vi_rec_fake_medium: "Significant signs of manipulation have been detected. A thorough manual review is recommended.",
        vi_rec_fake_low: "Anomalies have been detected, but the result is uncertain. An expert review is recommended.",
        vi_rec_real_high: "This video appears authentic. No signs of manipulation detected.",
        vi_rec_real_medium: "The video appears likely authentic, but a few frames show minor ambiguities.",
        vi_rec_real_low: "The model leans toward authenticity but with limited confidence. Further analysis may be helpful.",

        // Misc dynamic
        no_thumbnail: "No thumbnail",
        deepfake_detected: "Deepfake detected",
        authentic_image: "Authentic image",
        authentic_video: "Authentic video"
    },

    fr: {
        // Navigation
        nav_features: "Fonctionnalités",
        nav_performance: "Performance",
        nav_about: "À propos",
        nav_contact: "Contact",
        nav_try_now: "Essayer →",
        nav_back_home: "← Retour à l'accueil",

        // Hero Section
        hero_title_1: "Détectez les",
        hero_title_2: "Deepfakes",
        hero_title_3: "avec précision IA",
        hero_subtitle: "Modèle ConvNeXt-Base avancé atteignant 98% de précision avec explicabilité complète. Analysez images et vidéos instantanément avec visualisations Grad-CAM.",
        hero_stat_accuracy: "Précision",
        hero_stat_training: "Images d'entraînement",
        hero_stat_inference: "Temps d'inférence",
        hero_btn_try: "Essayer DeepGuard",
        hero_btn_learn: "En savoir plus",
        hero_badge_authentic: "AUTHENTIQUE",
        hero_badge_manipulated: "MANIPULÉ",
        hero_bar_authenticity: "Authenticité",
        hero_bar_manipulation: "Manipulation",

        // Features Section
        features_title: "Technologie de Pointe",
        feature_convnext_title: "ConvNeXt-Base",
        feature_convnext_desc: "Modèle état de l'art de 89M paramètres entraîné sur FaceForensics++ et Celeb-DF",
        feature_gradcam_title: "Heatmaps Grad-CAM",
        feature_gradcam_desc: "Explicabilité visuelle montrant exactement où le modèle détecte les anomalies",
        feature_video_title: "Timeline Vidéo",
        feature_video_desc: "Analyse image par image avec visualisation interactive de la timeline",
        feature_region_title: "Détection de Régions",
        feature_region_desc: "Identification automatique et mise en évidence des régions faciales suspectes",
        feature_confidence_title: "Score de Confiance",
        feature_confidence_desc: "Distributions de probabilités détaillées avec niveaux de confiance interprétables",
        feature_realtime_title: "Analyse Temps Réel",
        feature_realtime_desc: "Temps d'inférence inférieur à 300ms avec pipeline de prétraitement optimisé",

        // Performance Section
        performance_title: "Performance du Modèle",
        performance_subtitle: "Entraîné et validé sur des datasets académiques avec métriques de niveau recherche",
        metric_accuracy: "Précision",
        metric_precision: "Précision",
        metric_recall: "Rappel",
        metric_f1: "Score F1",
        metric_auc: "AUC-ROC",

        // About Section
        about_title: "À propos de DeepGuard",
        about_p1: "DeepGuard est un système de détection de deepfakes de pointe construit avec des techniques d'IA modernes. Utilisant une architecture ConvNeXt-Base et entraîné sur plus de 28 000 échantillons professionnels de FaceForensics++ et Celeb-DF, il atteint des performances de niveau recherche.",
        about_p2: "Le système fournit une explicabilité complète via les visualisations Grad-CAM, permettant aux utilisateurs de comprendre exactement pourquoi une prédiction a été faite. Pour les vidéos, l'analyse de la timeline image par image aide à identifier les portions qui ont pu être manipulées.",
        about_role: "Aspirante Ingénieure ML",
        about_education: "Master Informatique & Data Science",

        // Contact Section
        contact_title: "Me Contacter",
        contact_subtitle: "Un retour, un bug trouvé, ou une suggestion de fonctionnalité ? J'adorerais vous entendre !",
        contact_name: "Nom",
        contact_name_placeholder: "Votre nom",
        contact_email: "Email",
        contact_email_placeholder: "votre@email.com",
        contact_subject: "Sujet",
        contact_subject_placeholder: "Sélectionnez un sujet...",
        contact_subject_bug: "Signalement de bug",
        contact_subject_feature: "Demande de fonctionnalité",
        contact_subject_feedback: "Retour général",
        contact_subject_collab: "Collaboration",
        contact_subject_other: "Autre",
        contact_message: "Message",
        contact_message_placeholder: "Dites-m'en plus...",
        contact_submit: "Envoyer le message",

        // Footer
        footer_copyright: "© 2025 DeepGuard. Créé par Rania AMIL.",

        // App Page
        app_title: "Détection de Deepfakes par IA",
        app_subtitle: "Téléchargez une image ou vidéo pour analyser les manipulations deepfake avec explicabilité complète",
        tab_image: "Analyse d'Image",
        tab_video: "Analyse Vidéo",

        // Upload Section
        upload_image_title: "Déposez une image ici ou cliquez pour parcourir",
        upload_image_formats: "Formats : JPG, PNG, WebP, BMP • Max 10Mo",
        upload_video_title: "Déposez une vidéo ici ou cliquez pour parcourir",
        upload_video_formats: "Formats : MP4, AVI, MOV, WebM, MKV • Max 50Mo",
        upload_btn_image: "Choisir une image",
        upload_btn_video: "Choisir une vidéo",
        upload_or: "OU",
        upload_url_image: "Collez l'URL de l'image ici...",
        upload_url_video: "Collez l'URL directe de la vidéo (.mp4, .webm)...",
        upload_load_url: "Charger l'URL",

        // Results
        result_uploaded_image: "Image téléchargée",
        result_uploaded_video: "Vidéo téléchargée",
        result_analysis: "Résultat de l'analyse",
        result_reset: "Réinitialiser",
        result_analyze_image: "ANALYSER L'IMAGE",
        result_analyze_video: "ANALYSER LA VIDÉO",
        result_placeholder: "Cliquez sur \"Analyser\" pour lancer la détection",
        result_real: "AUTHENTIQUE",
        result_fake: "FAUX",
        result_real_desc: "Cette image semble être authentique.",
        result_fake_desc: "Manipulation deepfake détectée.",

        // Explainability
        explain_confidence: "Niveau de Confiance",
        explain_probability: "Distribution des Probabilités",
        explain_heatmap: "Carte de Chaleur (Grad-CAM)",
        explain_regions: "Régions Suspectes",
        explain_findings: "Points Clés",
        explain_technical: "Analyse Technique",
        explain_recommendation: "Recommandation",
        explain_low_attention: "Faible attention",
        explain_high_attention: "Forte attention",
        explain_prob_real: "Authentique",
        explain_prob_fake: "Faux",
        explain_position: "Position",
        explain_intensity: "Intensité",

        // Video Timeline
        timeline_title: "Analyse Image par Image",
        timeline_real: "Authentique",
        timeline_fake: "Faux",
        timeline_no_face: "Pas de visage",
        timeline_frames: "Images analysées",
        timeline_faces: "Visages détectés",
        timeline_fake_pct: "Images fausses",
        timeline_time: "Temps de traitement",
        suspicious_title: "Images les Plus Suspectes",

        // Model Metrics
        model_title: "Performance du Modèle",
        model_training: "Données d'entraînement",

        // How It Works
        how_title: "Comment fonctionne DeepGuard",
        how_convnext_title: "Modèle ConvNeXt-Base",
        how_convnext_desc: "Réseau de neurones profond de 89M paramètres entraîné sur plus de 28 000 images de FaceForensics++ et Celeb-DF.",
        how_gradcam_title: "Visualisation Grad-CAM",
        how_gradcam_desc: "Voyez exactement où le modèle concentre son attention pour prendre ses décisions, en mettant en évidence les régions suspectes.",
        how_multi_title: "Détection Multi-Méthodes",
        how_multi_desc: "Entraîné pour détecter Deepfakes, Face2Face, FaceSwap, NeuralTextures et les méthodes de manipulation Celeb-DF.",
        how_confidence_title: "Score de Confiance",
        how_confidence_desc: "Obtenez des distributions de probabilités détaillées et des niveaux de confiance pour comprendre la fiabilité de chaque prédiction.",
        how_video_title: "Processus d'Analyse Vidéo",
        how_frame_title: "Extraction d'Images",
        how_frame_desc: "Jusqu'à 30 images sont échantillonnées de la vidéo pour assurer une couverture complète tout en maintenant la vitesse.",
        how_face_title: "Détection de Visages",
        how_face_desc: "MTCNN détecte et extrait les visages de chaque image pour une analyse individuelle.",
        how_timeline_title: "Analyse de la Timeline",
        how_timeline_desc: "Visualisez les prédictions image par image sur une timeline interactive.",
        how_suspicious_title: "Détection d'Images Suspectes",
        how_suspicious_desc: "Les images les plus suspectes sont mises en évidence pour une inspection approfondie.",

        // Limitations
        limitations_title: "Limitations",
        limitation_1: "Fonctionne mieux sur les visages de face",
        limitation_2: "Peut être moins précis sur les images fortement compressées",
        limitation_3: "Optimisé pour la détection de manipulation faciale",
        limitation_4: "Les nouvelles techniques de manipulation peuvent ne pas être détectées",

        // Loading
        loading_analyzing: "Analyse en cours...",
        loading_wait: "Cela peut prendre quelques instants",
        loading_image: "Génération de la heatmap Grad-CAM et des prédictions",
        loading_video: "Extraction des images et détection des visages",
        loading_url: "Chargement depuis l'URL...",
        loading_step_upload: "Envoi du fichier...",
        loading_step_extracting: "Extraction des images...",
        loading_step_faces: "Détection des visages...",
        loading_step_analyzing: "Analyse des images...",
        loading_step_processing: "Traitement de l'image...",
        loading_step_gradcam: "Génération du Grad-CAM...",
        loading_step_generating: "Génération des résultats...",
        loading_step_done: "Terminé !",
        loading_dont_leave: "Merci de ne pas fermer cette page",
        loading_almost_there: "Presque terminé, patientez...",
        loading_final_steps: "Dernières étapes, un instant...",

        // Video Info
        video_info: "Informations Vidéo",
        video_duration: "Durée",
        video_fps: "IPS",
        video_resolution: "Résolution",

        // Error messages
        error_no_image: "Aucune image sélectionnée.",
        error_no_video: "Aucune vidéo sélectionnée.",
        error_invalid_url: "Format d'URL invalide.",
        error_load_image: "Erreur lors du chargement de l'image depuis l'URL.",
        error_load_video: "Erreur lors du chargement de la vidéo depuis l'URL.",
        error_analysis_image: "Erreur d'analyse de l'image.",
        error_analysis_video: "Erreur d'analyse de la vidéo.",

        // Recommendations - Real
        rec_real_high: "Ce média semble être authentique. Aucun signe de manipulation IA détecté.",
        rec_real_medium: "Ce média semble probablement authentique, bien que quelques ambiguïtés mineures aient été détectées.",
        rec_real_low: "Le modèle penche vers l'authenticité mais avec une confiance limitée. Une vérification manuelle est recommandée.",
        
        // Recommendations - Fake
        rec_fake_high: "De forts indicateurs de manipulation deepfake détectés. Nous recommandons fortement de NE PAS considérer ce média comme authentique.",
        rec_fake_medium: "Des signes significatifs de manipulation ont été détectés. Une vérification supplémentaire est conseillée.",
        rec_fake_low: "Certaines anomalies ont été détectées mais le résultat est incertain. Une analyse professionnelle peut être nécessaire.",

        // Confidence interpretation (dynamic results)
        conf_very_high: "Confiance très élevée.",
        conf_high: "Confiance élevée",
        conf_moderate: "Confiance modérée",
        conf_low: "Confiance faible.",
        conf_uncertain: "Très incertain.",
        conf_desc_very_high: "Le modèle est très confiant dans sa prédiction.",
        conf_desc_high: "Le modèle est confiant dans sa prédiction.",
        conf_desc_moderate: "Le modèle penche vers cette prédiction mais avec une certaine incertitude.",
        conf_desc_low: "Le modèle est incertain ; le résultat doit être interprété avec prudence.",
        conf_desc_uncertain: "Le modèle ne peut pas faire de détermination fiable.",

        // Explanation key points - Fake
        kp_fake_extensive_anomalies: "Régions d'anomalies étendues détectées sur le visage.",
        kp_fake_suspicious_regions: "régions suspectes identifiées.",
        kp_fake_high_artifacts: "Forte concentration d'artefacts dans certaines zones.",
        kp_fake_subtle_patterns: "Patterns de manipulation subtils détectés.",
        // Explanation key points - Real
        kp_real_no_anomalies: "Aucune anomalie significative détectée.",
        kp_real_consistent_texture: "Texture faciale cohérente et naturelle.",
        kp_real_authentic: "L'image présente des caractéristiques authentiques.",

        // Technical details - Fake
        td_fake_gan: "Analyse des artefacts de compression GAN.",
        td_fake_boundaries: "Détection des incohérences aux frontières du visage.",
        td_fake_texture: "Vérification de la cohérence de la texture de la peau.",
        td_fake_symmetry: "Analyse des micro-expressions et de la symétrie faciale.",
        // Technical details - Real
        td_real_texture: "Vérification de la cohérence des textures.",
        td_real_lighting: "Analyse de l'éclairage et des ombres.",
        td_real_resolution: "Vérification de la résolution et de la netteté.",
        td_real_proportions: "Validation des proportions faciales.",

        // Video interpretation key points
        vi_fake_entire: "Manipulation cohérente détectée tout au long de la vidéo.",
        vi_fake_majority: "Manipulation détectée dans la majorité des images analysées.",
        vi_fake_partial: "Signes de manipulation détectés dans certaines portions de la vidéo.",
        vi_fake_segments: "Segments suspects identifiés :",
        vi_real_clean: "Aucun signe de manipulation détecté.",
        vi_real_ambiguous: "La vidéo semble authentique malgré quelques images ambiguës.",

        // Video confidence levels
        vi_conf_very_high: "Confiance très élevée",
        vi_conf_high: "Confiance élevée",
        vi_conf_moderate: "Confiance modérée",
        vi_conf_low: "Confiance faible",

        // Video recommendations
        vi_rec_fake_high: "Cette vidéo présente de forts indicateurs de manipulation. Nous recommandons fortement de ne pas la considérer comme authentique.",
        vi_rec_fake_medium: "Des signes significatifs de manipulation ont été détectés. Un examen manuel approfondi est recommandé.",
        vi_rec_fake_low: "Des anomalies ont été détectées, mais le résultat est incertain. Un examen par un expert est recommandé.",
        vi_rec_real_high: "Cette vidéo semble authentique. Aucun signe de manipulation détecté.",
        vi_rec_real_medium: "La vidéo semble probablement authentique, mais quelques images montrent de légères ambiguïtés.",
        vi_rec_real_low: "Le modèle penche vers l'authenticité mais avec une confiance limitée. Une analyse complémentaire peut être utile.",

        // Misc dynamic
        no_thumbnail: "Pas de miniature",
        deepfake_detected: "Deepfake détecté",
        authentic_image: "Image authentique",
        authentic_video: "Vidéo authentique"
    },

    es: {
        // Navigation
        nav_features: "Características",
        nav_performance: "Rendimiento",
        nav_about: "Acerca de",
        nav_contact: "Contacto",
        nav_try_now: "Probar →",
        nav_back_home: "← Volver al inicio",

        // Hero Section
        hero_title_1: "Detecta",
        hero_title_2: "Deepfakes",
        hero_title_3: "con precisión IA",
        hero_subtitle: "Modelo ConvNeXt-Base avanzado con 98% de precisión y explicabilidad completa. Analiza imágenes y videos instantáneamente con visualizaciones Grad-CAM.",
        hero_stat_accuracy: "Precisión",
        hero_stat_training: "Imágenes de entrenamiento",
        hero_stat_inference: "Tiempo de inferencia",
        hero_btn_try: "Probar DeepGuard",
        hero_btn_learn: "Saber más",
        hero_badge_authentic: "AUTÉNTICO",
        hero_badge_manipulated: "MANIPULADO",
        hero_bar_authenticity: "Autenticidad",
        hero_bar_manipulation: "Manipulación",

        // Features Section
        features_title: "Tecnología de Vanguardia",
        feature_convnext_title: "ConvNeXt-Base",
        feature_convnext_desc: "Modelo de última generación con 89M de parámetros entrenado en FaceForensics++ y Celeb-DF",
        feature_gradcam_title: "Mapas de calor Grad-CAM",
        feature_gradcam_desc: "Explicabilidad visual mostrando exactamente dónde el modelo detecta anomalías",
        feature_video_title: "Línea de tiempo de video",
        feature_video_desc: "Análisis cuadro por cuadro con visualización interactiva de línea de tiempo",
        feature_region_title: "Detección de regiones",
        feature_region_desc: "Identificación automática y resaltado de regiones faciales sospechosas",
        feature_confidence_title: "Puntuación de confianza",
        feature_confidence_desc: "Distribuciones de probabilidad detalladas con niveles de confianza interpretables",
        feature_realtime_title: "Análisis en tiempo real",
        feature_realtime_desc: "Tiempo de inferencia inferior a 300ms con pipeline de preprocesamiento optimizado",

        // Performance Section
        performance_title: "Rendimiento del Modelo",
        performance_subtitle: "Entrenado y validado en datasets académicos con métricas de nivel de investigación",
        metric_accuracy: "Precisión",
        metric_precision: "Precisión",
        metric_recall: "Recall",
        metric_f1: "Puntuación F1",
        metric_auc: "AUC-ROC",

        // About Section
        about_title: "Acerca de DeepGuard",
        about_p1: "DeepGuard es un sistema de detección de deepfakes de vanguardia construido con técnicas modernas de IA. Usando una arquitectura ConvNeXt-Base y entrenado en más de 28,000 muestras profesionales de FaceForensics++ y Celeb-DF, alcanza un rendimiento de nivel de investigación.",
        about_p2: "El sistema proporciona explicabilidad completa a través de visualizaciones Grad-CAM, permitiendo a los usuarios entender exactamente por qué se hizo una predicción. Para videos, el análisis de línea de tiempo cuadro por cuadro ayuda a identificar qué porciones pueden haber sido manipuladas.",
        about_role: "Aspirante a Ingeniera ML",
        about_education: "Máster en Informática y Ciencia de Datos",

        // Contact Section
        contact_title: "Contáctame",
        contact_subtitle: "¿Tienes comentarios, encontraste un error o quieres sugerir una función? ¡Me encantaría saber de ti!",
        contact_name: "Nombre",
        contact_name_placeholder: "Tu nombre",
        contact_email: "Correo electrónico",
        contact_email_placeholder: "tu@email.com",
        contact_subject: "Asunto",
        contact_subject_placeholder: "Selecciona un tema...",
        contact_subject_bug: "Reporte de error",
        contact_subject_feature: "Solicitud de función",
        contact_subject_feedback: "Comentarios generales",
        contact_subject_collab: "Colaboración",
        contact_subject_other: "Otro",
        contact_message: "Mensaje",
        contact_message_placeholder: "Cuéntame más...",
        contact_submit: "Enviar mensaje",

        // Footer
        footer_copyright: "© 2025 DeepGuard. Creado por Rania AMIL.",

        // App Page
        app_title: "Detección de Deepfakes con IA",
        app_subtitle: "Sube una imagen o video para analizar manipulaciones deepfake con explicabilidad completa",
        tab_image: "Análisis de Imagen",
        tab_video: "Análisis de Video",

        // Upload Section
        upload_image_title: "Arrastra una imagen aquí o haz clic para explorar",
        upload_image_formats: "Formatos: JPG, PNG, WebP, BMP • Máx 10MB",
        upload_video_title: "Arrastra un video aquí o haz clic para explorar",
        upload_video_formats: "Formatos: MP4, AVI, MOV, WebM, MKV • Máx 50MB",
        upload_btn_image: "Elegir imagen",
        upload_btn_video: "Elegir video",
        upload_or: "O",
        upload_url_image: "Pega la URL de la imagen aquí...",
        upload_url_video: "Pega la URL directa del video (.mp4, .webm)...",
        upload_load_url: "Cargar URL",

        // Results
        result_uploaded_image: "Imagen subida",
        result_uploaded_video: "Video subido",
        result_analysis: "Resultado del análisis",
        result_reset: "Reiniciar",
        result_analyze_image: "ANALIZAR IMAGEN",
        result_analyze_video: "ANALIZAR VIDEO",
        result_placeholder: "Haz clic en \"Analizar\" para iniciar la detección",
        result_real: "AUTÉNTICO",
        result_fake: "FALSO",
        result_real_desc: "Esta imagen parece ser auténtica.",
        result_fake_desc: "Manipulación deepfake detectada.",

        // Explainability
        explain_confidence: "Nivel de Confianza",
        explain_probability: "Distribución de Probabilidades",
        explain_heatmap: "Mapa de Calor (Grad-CAM)",
        explain_regions: "Regiones Sospechosas",
        explain_findings: "Hallazgos Clave",
        explain_technical: "Análisis Técnico",
        explain_recommendation: "Recomendación",
        explain_low_attention: "Baja atención",
        explain_high_attention: "Alta atención",
        explain_prob_real: "Auténtico",
        explain_prob_fake: "Falso",
        explain_position: "Posición",
        explain_intensity: "Intensidad",

        // Video Timeline
        timeline_title: "Análisis Cuadro por Cuadro",
        timeline_real: "Auténtico",
        timeline_fake: "Falso",
        timeline_no_face: "Sin rostro",
        timeline_frames: "Cuadros analizados",
        timeline_faces: "Rostros detectados",
        timeline_fake_pct: "Cuadros falsos",
        timeline_time: "Tiempo de procesamiento",
        suspicious_title: "Cuadros Más Sospechosos",

        // Model Metrics
        model_title: "Rendimiento del Modelo",
        model_training: "Datos de entrenamiento",

        // How It Works
        how_title: "Cómo funciona DeepGuard",
        how_convnext_title: "Modelo ConvNeXt-Base",
        how_convnext_desc: "Red neuronal profunda de 89M parámetros entrenada en más de 28,000 imágenes de FaceForensics++ y Celeb-DF.",
        how_gradcam_title: "Visualización Grad-CAM",
        how_gradcam_desc: "Ve exactamente dónde el modelo enfoca su atención para tomar decisiones, resaltando regiones sospechosas.",
        how_multi_title: "Detección Multi-Método",
        how_multi_desc: "Entrenado para detectar Deepfakes, Face2Face, FaceSwap, NeuralTextures y métodos de manipulación Celeb-DF.",
        how_confidence_title: "Puntuación de Confianza",
        how_confidence_desc: "Obtén distribuciones de probabilidad detalladas y niveles de confianza para entender la fiabilidad de cada predicción.",
        how_video_title: "Proceso de Análisis de Video",
        how_frame_title: "Extracción de Cuadros",
        how_frame_desc: "Se muestrean hasta 30 cuadros del video para asegurar una cobertura completa manteniendo la velocidad.",
        how_face_title: "Detección de Rostros",
        how_face_desc: "MTCNN detecta y extrae rostros de cada cuadro para análisis individual.",
        how_timeline_title: "Análisis de Línea de Tiempo",
        how_timeline_desc: "Ve las predicciones cuadro por cuadro visualizadas en una línea de tiempo interactiva.",
        how_suspicious_title: "Detección de Cuadros Sospechosos",
        how_suspicious_desc: "Los cuadros más sospechosos se resaltan para una inspección más detallada.",

        // Limitations
        limitations_title: "Limitaciones",
        limitation_1: "Funciona mejor en rostros frontales",
        limitation_2: "Puede ser menos preciso en imágenes muy comprimidas",
        limitation_3: "Optimizado para detección de manipulación facial",
        limitation_4: "Las nuevas técnicas de manipulación pueden no ser detectadas",

        // Loading
        loading_analyzing: "Analizando...",
        loading_wait: "Esto puede tomar unos momentos",
        loading_image: "Generando mapa de calor Grad-CAM y predicciones",
        loading_video: "Extrayendo cuadros y detectando rostros",
        loading_url: "Cargando desde URL...",
        loading_step_upload: "Subiendo archivo...",
        loading_step_extracting: "Extrayendo cuadros...",
        loading_step_faces: "Detectando rostros...",
        loading_step_analyzing: "Analizando cuadros...",
        loading_step_processing: "Procesando imagen...",
        loading_step_gradcam: "Generando Grad-CAM...",
        loading_step_generating: "Generando resultados...",
        loading_step_done: "¡Listo!",
        loading_dont_leave: "Por favor no cierre esta página",
        loading_almost_there: "Casi listo, espere un momento...",
        loading_final_steps: "Pasos finales, un momento...",

        // Video Info
        video_info: "Información del Video",
        video_duration: "Duración",
        video_fps: "FPS",
        video_resolution: "Resolución",

        // Error messages
        error_no_image: "Ninguna imagen seleccionada.",
        error_no_video: "Ningún video seleccionado.",
        error_invalid_url: "Formato de URL inválido.",
        error_load_image: "Error al cargar la imagen desde la URL.",
        error_load_video: "Error al cargar el video desde la URL.",
        error_analysis_image: "Error de análisis de imagen.",
        error_analysis_video: "Error de análisis de video.",

        // Recommendations - Real
        rec_real_high: "Este medio parece ser auténtico. No se detectaron signos de manipulación IA.",
        rec_real_medium: "Este medio parece probablemente auténtico, aunque se detectaron algunas ambigüedades menores.",
        rec_real_low: "El modelo se inclina hacia la autenticidad pero con confianza limitada. Se recomienda revisión manual.",
        
        // Recommendations - Fake
        rec_fake_high: "Se detectaron fuertes indicadores de manipulación deepfake. Recomendamos encarecidamente NO considerar este medio como auténtico.",
        rec_fake_medium: "Se detectaron signos significativos de manipulación. Se aconseja verificación adicional.",
        rec_fake_low: "Se detectaron algunas anomalías pero el resultado es incierto. Puede ser necesario un análisis profesional.",

        // Confidence interpretation (dynamic results)
        conf_very_high: "Confianza muy alta.",
        conf_high: "Confianza alta",
        conf_moderate: "Confianza moderada",
        conf_low: "Confianza baja.",
        conf_uncertain: "Muy incierto.",
        conf_desc_very_high: "El modelo tiene mucha confianza en su predicción.",
        conf_desc_high: "El modelo tiene confianza en su predicción.",
        conf_desc_moderate: "El modelo se inclina hacia esta predicción pero con cierta incertidumbre.",
        conf_desc_low: "El modelo es incierto; el resultado debe interpretarse con precaución.",
        conf_desc_uncertain: "El modelo no puede hacer una determinación fiable.",

        // Explanation key points - Fake
        kp_fake_extensive_anomalies: "Regiones extensas de anomalías detectadas en el rostro.",
        kp_fake_suspicious_regions: "regiones sospechosas identificadas.",
        kp_fake_high_artifacts: "Alta concentración de artefactos en ciertas áreas.",
        kp_fake_subtle_patterns: "Patrones sutiles de manipulación detectados.",
        // Explanation key points - Real
        kp_real_no_anomalies: "No se detectaron anomalías significativas.",
        kp_real_consistent_texture: "Textura facial consistente y natural.",
        kp_real_authentic: "La imagen exhibe características auténticas.",

        // Technical details - Fake
        td_fake_gan: "Análisis de artefactos de compresión GAN.",
        td_fake_boundaries: "Detección de inconsistencias en los límites del rostro.",
        td_fake_texture: "Verificación de consistencia de la textura de la piel.",
        td_fake_symmetry: "Análisis de micro-expresiones y simetría facial.",
        // Technical details - Real
        td_real_texture: "Verificación de consistencia de textura.",
        td_real_lighting: "Análisis de iluminación y sombras.",
        td_real_resolution: "Verificación de resolución y nitidez.",
        td_real_proportions: "Validación de proporciones faciales.",

        // Video interpretation key points
        vi_fake_entire: "Manipulación consistente detectada a lo largo de todo el video.",
        vi_fake_majority: "Manipulación detectada en la mayoría de los cuadros analizados.",
        vi_fake_partial: "Signos de manipulación detectados en ciertas porciones del video.",
        vi_fake_segments: "Segmentos sospechosos identificados:",
        vi_real_clean: "No se detectaron signos de manipulación.",
        vi_real_ambiguous: "El video parece auténtico a pesar de algunos cuadros ambiguos.",

        // Video confidence levels
        vi_conf_very_high: "Confianza muy alta",
        vi_conf_high: "Confianza alta",
        vi_conf_moderate: "Confianza moderada",
        vi_conf_low: "Confianza baja",

        // Video recommendations
        vi_rec_fake_high: "Este video muestra fuertes indicadores de manipulación. Recomendamos encarecidamente no considerarlo auténtico.",
        vi_rec_fake_medium: "Se detectaron signos significativos de manipulación. Se recomienda una revisión manual exhaustiva.",
        vi_rec_fake_low: "Se detectaron anomalías, pero el resultado es incierto. Se recomienda una revisión por un experto.",
        vi_rec_real_high: "Este video parece auténtico. No se detectaron signos de manipulación.",
        vi_rec_real_medium: "El video parece probablemente auténtico, pero algunos cuadros muestran ambigüedades menores.",
        vi_rec_real_low: "El modelo se inclina hacia la autenticidad pero con confianza limitada. Un análisis adicional puede ser útil.",

        // Misc dynamic
        no_thumbnail: "Sin miniatura",
        deepfake_detected: "Deepfake detectado",
        authentic_image: "Imagen auténtica",
        authentic_video: "Video auténtico"
    }
};

/**
 * i18n Manager Class
 */
class I18nManager {
    constructor() {
        this.currentLang = this.getStoredLanguage() || 'en';
        this.translations = translations;
    }

    getStoredLanguage() {
        try {
            return localStorage.getItem('deepguard_lang');
        } catch {
            return null;
        }
    }

    setLanguage(lang) {
        if (!this.translations[lang]) {
            console.warn(`Language ${lang} not supported`);
            return;
        }
        this.currentLang = lang;
        try {
            localStorage.setItem('deepguard_lang', lang);
        } catch {}
        this.updatePage();
        this.updateLanguageButtons();
    }

    t(key) {
        return this.translations[this.currentLang]?.[key] || 
               this.translations['en']?.[key] || 
               key;
    }

    updatePage() {
        // Update all elements with data-i18n attribute
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            const translation = this.t(key);
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                if (el.placeholder) el.placeholder = translation;
            } else if (el.tagName === 'OPTION') {
                el.textContent = translation;
            } else {
                el.textContent = translation;
            }
        });
        
        // Update all elements with data-i18n-placeholder attribute
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            el.placeholder = this.t(key);
        });
        
        this.updatePageTitle();

        // Re-translate any dynamically generated results currently on screen
        this.retranslateDynamicResults();
    }

    updatePageTitle() {
        const path = window.location.pathname;
        if (path.includes('app.html')) {
            document.title = `DeepGuard - ${this.t('app_title')}`;
        }
    }

    updateLanguageButtons() {
        document.querySelectorAll('.lang-btn').forEach(btn => {
            const lang = btn.getAttribute('data-lang');
            btn.classList.toggle('active', lang === this.currentLang);
        });
    }

    /**
     * Re-translate dynamically generated result sections when language changes.
     * Uses stored result data to regenerate translated HTML.
     */
    retranslateDynamicResults() {
        // Re-translate image results if they are currently displayed
        if (window.resultsDisplay && window.resultsDisplay._lastImageResult) {
            const imageResultsSection = document.getElementById('imageResults');
            if (imageResultsSection && imageResultsSection.style.display !== 'none') {
                window.resultsDisplay.displayImageResults(window.resultsDisplay._lastImageResult);
            }
        }

        // Re-translate video results if they are currently displayed
        if (window.resultsDisplay && window.resultsDisplay._lastVideoResult) {
            const videoResultsSection = document.getElementById('videoResults');
            if (videoResultsSection && videoResultsSection.style.display !== 'none') {
                window.resultsDisplay.displayVideoResults(window.resultsDisplay._lastVideoResult);
            }
        }
    }

    init() {
        this.updatePage();
        this.updateLanguageButtons();
    }
}

window.i18n = new I18nManager();
document.addEventListener('DOMContentLoaded', () => window.i18n.init());
