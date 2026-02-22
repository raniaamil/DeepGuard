/**
 * DeepGuard Results Display - Enhanced Version
 * Affichage des résultats avec visualisations
 */

class ResultsDisplay {
    constructor() {
        this.animationDuration = 800;
    }

    /**
     * Affiche les résultats d'analyse d'image
     */
    displayImageResults(result) {
        console.log('Displaying image results:', result);
        
        // Afficher le résultat principal
        this.displayMainResult('imageResultCard', result);
        
        // Afficher la section d'explicabilité
        const explainSection = document.getElementById('imageExplainability');
        if (explainSection) {
            explainSection.style.display = 'block';
            explainSection.innerHTML = this.generateExplainabilityHTML(result);
        }

        // Afficher les métriques du modèle
        const metricsSection = document.getElementById('imageModelMetrics');
        if (metricsSection) {
            metricsSection.style.display = 'block';
            metricsSection.innerHTML = this.generateModelMetricsHTML(result.model_metrics);
        }

        // Animation
        this.animateResults();
    }

    /**
     * Affiche les résultats d'analyse vidéo
     */
    displayVideoResults(result) {
        console.log('Displaying video results:', result);
        
        // Résultat principal
        this.displayMainResult('videoResultCard', result);
        
        // Timeline
        const timelineSection = document.getElementById('videoTimeline');
        if (timelineSection && result.timeline) {
            timelineSection.style.display = 'block';
            timelineSection.innerHTML = this.generateTimelineHTML(result);
        }

        // Frames suspectes
        const suspiciousSection = document.getElementById('videoSuspiciousFrames');
        if (suspiciousSection && result.suspicious_frames && result.suspicious_frames.length > 0) {
            suspiciousSection.style.display = 'block';
            suspiciousSection.innerHTML = this.generateSuspiciousFramesHTML(result.suspicious_frames);
        }

        // Stats vidéo
        const statsSection = document.getElementById('videoAnalysisStats');
        if (statsSection && result.analysis_stats) {
            statsSection.style.display = 'block';
            statsSection.innerHTML = this.generateVideoStatsHTML(result);
        }

        // Métriques modèle
        const metricsSection = document.getElementById('videoModelMetrics');
        if (metricsSection) {
            metricsSection.style.display = 'block';
            metricsSection.innerHTML = this.generateModelMetricsHTML(result.model_metrics);
        }

        this.animateResults();
    }

    /**
     * Affiche le résultat principal (REAL/FAKE)
     */
    displayMainResult(cardId, result) {
        const card = document.getElementById(cardId);
        if (!card) return;

        const isReal = !result.is_deepfake;
        const status = isReal ? 'REAL' : 'FAKE';
        const statusIcon = isReal ? '✅' : '⚠️';
        const confidence = (result.confidence * 100).toFixed(1);

        card.className = `result-card ${isReal ? 'real' : 'fake'} animate-fadeIn`;
        card.innerHTML = `
            <div class="result-status">${statusIcon} ${status}</div>
            <div class="result-confidence">${confidence}%</div>
            <p class="result-description">
                ${isReal 
                    ? 'This image/video appears to be authentic.' 
                    : 'Deepfake manipulation detected.'}
            </p>
        `;
    }

    /**
     * Génère le HTML pour l'explicabilité (Grad-CAM, confiance, etc.)
     */
    generateExplainabilityHTML(result) {
        const explainability = result.explainability || {};
        const confidence = result.confidence;
        const isReal = !result.is_deepfake;

        let html = '<div class="explainability-grid">';

        // Gauge de confiance
        html += `
            <div class="explain-card">
                <h4>Confidence Level</h4>
                <div class="confidence-gauge">
                    ${window.DeepGuardUtils.createGaugeSVG(
                        confidence * 100, 
                        window.DeepGuardUtils.getConfidenceColor(confidence)
                    )}
                    <div class="gauge-center">
                        <span class="gauge-value" style="color: ${window.DeepGuardUtils.getConfidenceColor(confidence)}">
                            ${(confidence * 100).toFixed(1)}%
                        </span>
                        <span class="gauge-label">Confidence</span>
                    </div>
                </div>
                ${explainability.confidence_interpretation ? `
                    <div class="confidence-interpretation">
                        <div class="confidence-level" style="color: ${explainability.confidence_interpretation.color}">
                            ${explainability.confidence_interpretation.label}
                        </div>
                        <div class="confidence-desc">${explainability.confidence_interpretation.description}</div>
                    </div>
                ` : ''}
            </div>
        `;

        // Probabilités
        html += `
            <div class="explain-card">
                <h4>Probability Distribution</h4>
                <div class="probability-section">
                    <div class="prob-item">
                        <div class="prob-header">
                            <span class="prob-label">✅ Real</span>
                            <span class="prob-value">${(result.probabilities.real * 100).toFixed(1)}%</span>
                        </div>
                        <div class="prob-bar">
                            <div class="prob-fill real" style="width: ${result.probabilities.real * 100}%"></div>
                        </div>
                    </div>
                    <div class="prob-item">
                        <div class="prob-header">
                            <span class="prob-label">⚠️ Fake</span>
                            <span class="prob-value">${(result.probabilities.fake * 100).toFixed(1)}%</span>
                        </div>
                        <div class="prob-bar">
                            <div class="prob-fill fake" style="width: ${result.probabilities.fake * 100}%"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Grad-CAM heatmap
        if (explainability.heatmap_overlay_base64) {
            html += `
                <div class="explain-card">
                    <h4> Attention Heatmap (Grad-CAM)</h4>
                    <div class="gradcam-container">
                        <img class="gradcam-image" src="data:image/png;base64,${explainability.heatmap_overlay_base64}" alt="Grad-CAM Heatmap">
                    </div>
                    <div class="gradcam-legend">
                        <span>Low attention</span>
                        <div class="gradient-bar"></div>
                        <span>High attention</span>
                    </div>
                </div>
            `;
        }

        // Régions suspectes
        if (explainability.suspicious_regions && explainability.suspicious_regions.length > 0) {
            html += `
                <div class="explain-card">
                    <h4> Suspicious Regions</h4>
                    <div class="regions-list">
                        ${explainability.suspicious_regions.map(region => `
                            <div class="region-item">
                                <div class="region-number">${region.id}</div>
                                <div class="region-info">
                                    <div class="region-coords">Position: ${region.x_percent.toFixed(0)}%, ${region.y_percent.toFixed(0)}%</div>
                                    <div class="region-intensity">Intensity: ${(region.intensity * 100).toFixed(0)}%</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        // Points clés de l'explication
        if (explainability.explanation) {
            const explanation = explainability.explanation;
            
            html += `
                <div class="explain-card">
                    <h4>Key Findings</h4>
                    <div class="key-points-list">
                        ${explanation.key_points.map(point => `
                            <div class="key-point">
                                <span class="key-point-icon">${isReal ? '✓' : '!'}</span>
                                <span class="key-point-text">${point}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;

            html += `
                <div class="explain-card">
                    <h4> Technical Analysis</h4>
                    <div class="tech-details-list">
                        ${explanation.technical_details.map(detail => `
                            <div class="tech-detail">${detail}</div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        html += '</div>';

        // Recommandation
        html += `
            <div class="recommendation-section">
                <h4>Recommendation</h4>
                <p class="recommendation-text">
                    ${this.getRecommendation(isReal, confidence)}
                </p>
            </div>
        `;

        return html;
    }

    /**
     * Génère le HTML pour la timeline vidéo
     */
    generateTimelineHTML(result) {
        const timeline = result.timeline || [];
        const stats = result.analysis_stats || {};

        return `
            <div class="timeline-section">
                <div class="timeline-header">
                    <h3>Frame-by-Frame Analysis</h3>
                    <div class="timeline-legend">
                        <div class="legend-item">
                            <div class="legend-dot real"></div>
                            <span>Real</span>
                        </div>
                        <div class="legend-item">
                            <div class="legend-dot fake"></div>
                            <span>Fake</span>
                        </div>
                        <div class="legend-item">
                            <div class="legend-dot no-face"></div>
                            <span>No face</span>
                        </div>
                    </div>
                </div>
                <div class="timeline-chart">
                    <div class="timeline-bars">
                        ${window.DeepGuardUtils.createTimelineBars(timeline)}
                    </div>
                </div>
                <div class="timeline-axis">
                    <span>${timeline[0]?.timestamp_formatted || '00:00'}</span>
                    <span>${timeline[Math.floor(timeline.length/2)]?.timestamp_formatted || ''}</span>
                    <span>${timeline[timeline.length-1]?.timestamp_formatted || ''}</span>
                </div>
                <div class="video-stats">
                    <div class="video-stat">
                        <div class="video-stat-value">${stats.frames_extracted || 0}</div>
                        <div class="video-stat-label">Frames Analyzed</div>
                    </div>
                    <div class="video-stat">
                        <div class="video-stat-value">${stats.frames_with_faces || 0}</div>
                        <div class="video-stat-label">Faces Detected</div>
                    </div>
                    <div class="video-stat">
                        <div class="video-stat-value">${stats.fake_percentage?.toFixed(1) || 0}%</div>
                        <div class="video-stat-label">Fake Frames</div>
                    </div>
                    <div class="video-stat">
                        <div class="video-stat-value">${stats.processing_time_seconds?.toFixed(1) || 0}s</div>
                        <div class="video-stat-label">Processing Time</div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Génère le HTML pour les frames suspectes
     */
    generateSuspiciousFramesHTML(frames) {
        if (!frames || frames.length === 0) return '';

        return `
            <div class="suspicious-frames-section">
                <h3>⚠️ Most Suspicious Frames</h3>
                <div class="frames-gallery">
                    ${frames.map(frame => `
                        <div class="frame-card">
                            ${frame.thumbnail_base64 
                                ? `<img class="frame-image" src="data:image/jpeg;base64,${frame.thumbnail_base64}" alt="Frame ${frame.frame_index}">`
                                : '<div class="frame-image" style="background: var(--bg-secondary); display: flex; align-items: center; justify-content: center;">No thumbnail</div>'
                            }
                            <div class="frame-info">
                                <div class="frame-timestamp">⏱️ ${frame.timestamp_formatted}</div>
                                <div class="frame-confidence">
                                    <span class="frame-confidence-label">Confidence:</span>
                                    <span class="frame-confidence-value">${(frame.confidence * 100).toFixed(1)}%</span>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    /**
     * Génère le HTML pour les stats vidéo
     */
    generateVideoStatsHTML(result) {
        const metadata = result.video_metadata || {};
        const interpretation = result.interpretation || {};

        return `
            <div class="explain-card">
                <h4>Video Information</h4>
                <div class="video-stats">
                    <div class="video-stat">
                        <div class="video-stat-value">${metadata.duration_seconds?.toFixed(1) || 0}s</div>
                        <div class="video-stat-label">Duration</div>
                    </div>
                    <div class="video-stat">
                        <div class="video-stat-value">${metadata.fps?.toFixed(0) || 0}</div>
                        <div class="video-stat-label">FPS</div>
                    </div>
                    <div class="video-stat">
                        <div class="video-stat-value">${metadata.resolution || 'N/A'}</div>
                        <div class="video-stat-label">Resolution</div>
                    </div>
                </div>
            </div>

            ${interpretation.key_points ? `
                <div class="explain-card">
                    <h4> Key Findings</h4>
                    <div class="key-points-list">
                        ${interpretation.key_points.map(point => `
                            <div class="key-point">
                                <span class="key-point-icon">•</span>
                                <span class="key-point-text">${point}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}

            ${interpretation.recommendation ? `
                <div class="recommendation-section">
                    <h4>Recommendation</h4>
                    <p class="recommendation-text">${interpretation.recommendation}</p>
                </div>
            ` : ''}
        `;
    }

    /**
     * Génère le HTML pour les métriques du modèle
     */
    generateModelMetricsHTML(metrics) {
        if (!metrics) return '';

        return `
            <div class="model-metrics-section">
                <div class="metrics-header">
                    <h3>Model Performance</h3>
                </div>
                <div class="metrics-grid">
                    <div class="metric-item">
                        <div class="metric-value">${metrics.accuracy || '98.05%'}</div>
                        <div class="metric-label">Accuracy</div>
                    </div>
                    <div class="metric-item">
                        <div class="metric-value">${metrics.precision || '98.21%'}</div>
                        <div class="metric-label">Precision</div>
                    </div>
                    <div class="metric-item">
                        <div class="metric-value">${metrics.recall || '98.84%'}</div>
                        <div class="metric-label">Recall</div>
                    </div>
                    <div class="metric-item">
                        <div class="metric-value">${metrics.f1_score || '98.52%'}</div>
                        <div class="metric-label">F1 Score</div>
                    </div>
                    <div class="metric-item">
                        <div class="metric-value">${metrics.auc_roc || '0.9928'}</div>
                        <div class="metric-label">AUC-ROC</div>
                    </div>
                    <div class="metric-item">
                        <div class="metric-value">${metrics.training_samples || '28k+'}</div>
                        <div class="metric-label">Training Data</div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Génère une recommandation basée sur le résultat
     */
    getRecommendation(isReal, confidence) {
        if (isReal) {
            if (confidence >= 0.9) {
                return "This media appears to be authentic. No signs of AI manipulation were detected. The analysis shows natural characteristics consistent with genuine content.";
            } else if (confidence >= 0.7) {
                return "This media appears to be likely authentic, though some minor ambiguities were detected. Consider additional verification if this is critical content.";
            } else {
                return "The model leans toward authenticity but with limited confidence. Manual review or additional analysis tools are recommended.";
            }
        } else {
            if (confidence >= 0.9) {
                return "Strong indicators of deepfake manipulation detected. We strongly recommend NOT treating this media as authentic. Consider reporting if found in a public context.";
            } else if (confidence >= 0.7) {
                return "Significant signs of manipulation were detected. Additional verification through other tools or manual expert review is advised.";
            } else {
                return "Some anomalies were detected but the result is uncertain. Professional forensic analysis may be needed for conclusive determination.";
            }
        }
    }

    /**
     * Anime les résultats
     */
    animateResults() {
        // Animation des barres de probabilité
        setTimeout(() => {
            document.querySelectorAll('.prob-fill').forEach(bar => {
                const width = bar.style.width;
                bar.style.width = '0%';
                setTimeout(() => {
                    bar.style.width = width;
                }, 100);
            });
        }, 200);

        // Animation des timeline bars
        document.querySelectorAll('.timeline-bar').forEach((bar, index) => {
            const height = bar.style.height;
            bar.style.height = '0%';
            setTimeout(() => {
                bar.style.height = height;
            }, 50 + index * 30);
        });
    }
}

// Instance globale
window.resultsDisplay = new ResultsDisplay();
