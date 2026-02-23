/**
 * DeepGuard Results Display - Enhanced Version with i18n & SVG Icons
 */

class ResultsDisplay {
    constructor() {
        this.animationDuration = 800;
    }

    t(key) {
        return window.i18n ? window.i18n.t(key) : key;
    }

    icon(name, size = 20) {
        return window.getIcon ? window.getIcon(name, size) : '';
    }

    displayImageResults(result) {
        console.log('Displaying image results:', result);
        this.displayMainResult('imageResultCard', result);
        
        const explainSection = document.getElementById('imageExplainability');
        if (explainSection) {
            explainSection.style.display = 'block';
            explainSection.innerHTML = this.generateExplainabilityHTML(result);
        }

        const metricsSection = document.getElementById('imageModelMetrics');
        if (metricsSection) {
            metricsSection.style.display = 'block';
            metricsSection.innerHTML = this.generateModelMetricsHTML(result.model_metrics);
        }
        this.animateResults();
    }

    displayVideoResults(result) {
        console.log('Displaying video results:', result);
        this.displayMainResult('videoResultCard', result);
        
        const timelineSection = document.getElementById('videoTimeline');
        if (timelineSection && result.timeline) {
            timelineSection.style.display = 'block';
            timelineSection.innerHTML = this.generateTimelineHTML(result);
        }

        const suspiciousSection = document.getElementById('videoSuspiciousFrames');
        if (suspiciousSection && result.suspicious_frames && result.suspicious_frames.length > 0) {
            suspiciousSection.style.display = 'block';
            suspiciousSection.innerHTML = this.generateSuspiciousFramesHTML(result.suspicious_frames);
        }

        const statsSection = document.getElementById('videoAnalysisStats');
        if (statsSection && result.analysis_stats) {
            statsSection.style.display = 'block';
            statsSection.innerHTML = this.generateVideoStatsHTML(result);
        }

        const metricsSection = document.getElementById('videoModelMetrics');
        if (metricsSection) {
            metricsSection.style.display = 'block';
            metricsSection.innerHTML = this.generateModelMetricsHTML(result.model_metrics);
        }
        this.animateResults();
    }

    displayMainResult(cardId, result) {
        const card = document.getElementById(cardId);
        if (!card) return;

        const isReal = !result.is_deepfake;
        const status = isReal ? this.t('result_real') : this.t('result_fake');
        const statusIcon = isReal ? this.icon('shield', 32) : this.icon('warning', 32);
        const confidence = (result.confidence * 100).toFixed(1);
        const description = isReal ? this.t('result_real_desc') : this.t('result_fake_desc');

        card.className = `result-card ${isReal ? 'real' : 'fake'} animate-fadeIn`;
        card.innerHTML = `
            <div class="result-status">
                <span class="result-icon">${statusIcon}</span>
                ${status}
            </div>
            <div class="result-confidence">${confidence}%</div>
            <p class="result-description">${description}</p>
        `;
    }

    generateExplainabilityHTML(result) {
        const explainability = result.explainability || {};
        const confidence = result.confidence;
        const isReal = !result.is_deepfake;

        let html = '<div class="explainability-grid">';

        // Confidence gauge
        html += `
            <div class="explain-card">
                <h4>${this.icon('gauge', 20)} ${this.t('explain_confidence')}</h4>
                <div class="confidence-gauge">
                    ${window.DeepGuardUtils.createGaugeSVG(confidence * 100, window.DeepGuardUtils.getConfidenceColor(confidence))}
                    <div class="gauge-center">
                        <span class="gauge-value" style="color: ${window.DeepGuardUtils.getConfidenceColor(confidence)}">${(confidence * 100).toFixed(1)}%</span>
                        <span class="gauge-label">${this.t('explain_confidence')}</span>
                    </div>
                </div>
                ${explainability.confidence_interpretation ? `
                    <div class="confidence-interpretation">
                        <div class="confidence-level" style="color: ${explainability.confidence_interpretation.color}">${explainability.confidence_interpretation.label}</div>
                        <div class="confidence-desc">${explainability.confidence_interpretation.description}</div>
                    </div>
                ` : ''}
            </div>
        `;

        // Probabilities
        html += `
            <div class="explain-card">
                <h4>${this.icon('chart', 20)} ${this.t('explain_probability')}</h4>
                <div class="probability-section">
                    <div class="prob-item">
                        <div class="prob-header">
                            <span class="prob-label">${this.t('explain_prob_real')}</span>
                            <span class="prob-value">${(result.probabilities.real * 100).toFixed(1)}%</span>
                        </div>
                        <div class="prob-bar"><div class="prob-fill real" style="width: ${result.probabilities.real * 100}%"></div></div>
                    </div>
                    <div class="prob-item">
                        <div class="prob-header">
                            <span class="prob-label">${this.t('explain_prob_fake')}</span>
                            <span class="prob-value">${(result.probabilities.fake * 100).toFixed(1)}%</span>
                        </div>
                        <div class="prob-bar"><div class="prob-fill fake" style="width: ${result.probabilities.fake * 100}%"></div></div>
                    </div>
                </div>
            </div>
        `;

        // Grad-CAM
        if (explainability.heatmap_overlay_base64) {
            html += `
                <div class="explain-card">
                    <h4>${this.icon('flame', 20)} ${this.t('explain_heatmap')}</h4>
                    <div class="gradcam-container">
                        <img class="gradcam-image" src="data:image/png;base64,${explainability.heatmap_overlay_base64}" alt="Grad-CAM">
                    </div>
                    <div class="gradcam-legend">
                        <span>${this.t('explain_low_attention')}</span>
                        <div class="gradient-bar"></div>
                        <span>${this.t('explain_high_attention')}</span>
                    </div>
                </div>
            `;
        }

        // Suspicious regions
        if (explainability.suspicious_regions && explainability.suspicious_regions.length > 0) {
            html += `
                <div class="explain-card">
                    <h4>${this.icon('target', 20)} ${this.t('explain_regions')}</h4>
                    <div class="regions-list">
                        ${explainability.suspicious_regions.map(region => `
                            <div class="region-item">
                                <div class="region-number">${region.id}</div>
                                <div class="region-info">
                                    <div class="region-coords">${this.t('explain_position')}: ${region.x_percent.toFixed(0)}%, ${region.y_percent.toFixed(0)}%</div>
                                    <div class="region-intensity">${this.t('explain_intensity')}: ${(region.intensity * 100).toFixed(0)}%</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        // Key findings
        if (explainability.explanation) {
            const explanation = explainability.explanation;
            html += `
                <div class="explain-card">
                    <h4>${this.icon('sparkles', 20)} ${this.t('explain_findings')}</h4>
                    <div class="key-points-list">
                        ${explanation.key_points.map(point => `
                            <div class="key-point">
                                <span class="key-point-icon">${isReal ? this.icon('check', 16) : this.icon('warning', 16)}</span>
                                <span class="key-point-text">${point}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
                <div class="explain-card">
                    <h4>${this.icon('scan', 20)} ${this.t('explain_technical')}</h4>
                    <div class="tech-details-list">
                        ${explanation.technical_details.map(detail => `<div class="tech-detail">${detail}</div>`).join('')}
                    </div>
                </div>
            `;
        }

        html += '</div>';

        // Recommendation
        html += `
            <div class="recommendation-section">
                <h4>${this.icon('info', 20)} ${this.t('explain_recommendation')}</h4>
                <p class="recommendation-text">${this.getRecommendation(isReal, confidence)}</p>
            </div>
        `;

        return html;
    }

    generateTimelineHTML(result) {
        const timeline = result.timeline || [];
        const stats = result.analysis_stats || {};

        return `
            <div class="timeline-section">
                <div class="timeline-header">
                    <h3>${this.icon('activity', 22)} ${this.t('timeline_title')}</h3>
                    <div class="timeline-legend">
                        <div class="legend-item"><div class="legend-dot real"></div><span>${this.t('timeline_real')}</span></div>
                        <div class="legend-item"><div class="legend-dot fake"></div><span>${this.t('timeline_fake')}</span></div>
                        <div class="legend-item"><div class="legend-dot no-face"></div><span>${this.t('timeline_no_face')}</span></div>
                    </div>
                </div>
                <div class="timeline-chart">
                    <div class="timeline-bars">${window.DeepGuardUtils.createTimelineBars(timeline)}</div>
                </div>
                <div class="timeline-axis">
                    <span>${timeline[0]?.timestamp_formatted || '00:00'}</span>
                    <span>${timeline[Math.floor(timeline.length/2)]?.timestamp_formatted || ''}</span>
                    <span>${timeline[timeline.length-1]?.timestamp_formatted || ''}</span>
                </div>
                <div class="video-stats">
                    <div class="video-stat"><div class="video-stat-value">${stats.frames_extracted || 0}</div><div class="video-stat-label">${this.t('timeline_frames')}</div></div>
                    <div class="video-stat"><div class="video-stat-value">${stats.frames_with_faces || 0}</div><div class="video-stat-label">${this.t('timeline_faces')}</div></div>
                    <div class="video-stat"><div class="video-stat-value">${stats.fake_percentage?.toFixed(1) || 0}%</div><div class="video-stat-label">${this.t('timeline_fake_pct')}</div></div>
                    <div class="video-stat"><div class="video-stat-value">${stats.processing_time_seconds?.toFixed(1) || 0}s</div><div class="video-stat-label">${this.t('timeline_time')}</div></div>
                </div>
            </div>
        `;
    }

    generateSuspiciousFramesHTML(frames) {
        if (!frames || frames.length === 0) return '';
        return `
            <div class="suspicious-frames-section">
                <h3>${this.icon('warning', 22)} ${this.t('suspicious_title')}</h3>
                <div class="frames-gallery">
                    ${frames.map(frame => `
                        <div class="frame-card">
                            ${frame.thumbnail_base64 
                                ? `<img class="frame-image" src="data:image/jpeg;base64,${frame.thumbnail_base64}" alt="Frame">`
                                : '<div class="frame-image" style="background:var(--bg-secondary);display:flex;align-items:center;justify-content:center;">No thumbnail</div>'
                            }
                            <div class="frame-info">
                                <div class="frame-timestamp">${this.icon('clock', 14)} ${frame.timestamp_formatted}</div>
                                <div class="frame-confidence">
                                    <span class="frame-confidence-label">${this.t('explain_confidence')}:</span>
                                    <span class="frame-confidence-value">${(frame.confidence * 100).toFixed(1)}%</span>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    generateVideoStatsHTML(result) {
        const metadata = result.video_metadata || {};
        const interpretation = result.interpretation || {};
        return `
            <div class="explain-card">
                <h4>${this.icon('video', 20)} ${this.t('video_info')}</h4>
                <div class="video-stats">
                    <div class="video-stat"><div class="video-stat-value">${metadata.duration_seconds?.toFixed(1) || 0}s</div><div class="video-stat-label">${this.t('video_duration')}</div></div>
                    <div class="video-stat"><div class="video-stat-value">${metadata.fps?.toFixed(0) || 0}</div><div class="video-stat-label">${this.t('video_fps')}</div></div>
                    <div class="video-stat"><div class="video-stat-value">${metadata.resolution || 'N/A'}</div><div class="video-stat-label">${this.t('video_resolution')}</div></div>
                </div>
            </div>
            ${interpretation.key_points ? `
                <div class="explain-card">
                    <h4>${this.icon('sparkles', 20)} ${this.t('explain_findings')}</h4>
                    <div class="key-points-list">
                        ${interpretation.key_points.map(point => `
                            <div class="key-point"><span class="key-point-icon">${this.icon('info', 16)}</span><span class="key-point-text">${point}</span></div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
            ${interpretation.recommendation ? `
                <div class="recommendation-section">
                    <h4>${this.icon('info', 20)} ${this.t('explain_recommendation')}</h4>
                    <p class="recommendation-text">${interpretation.recommendation}</p>
                </div>
            ` : ''}
        `;
    }

    generateModelMetricsHTML(metrics) {
        if (!metrics) return '';
        return `
            <div class="model-metrics-section">
                <div class="metrics-header"><h3>${this.icon('brain', 22)} ${this.t('model_title')}</h3></div>
                <div class="metrics-grid">
                    <div class="metric-item"><div class="metric-value">${metrics.accuracy || '98.05%'}</div><div class="metric-label">${this.t('metric_accuracy')}</div></div>
                    <div class="metric-item"><div class="metric-value">${metrics.precision || '98.21%'}</div><div class="metric-label">${this.t('metric_precision')}</div></div>
                    <div class="metric-item"><div class="metric-value">${metrics.recall || '98.84%'}</div><div class="metric-label">${this.t('metric_recall')}</div></div>
                    <div class="metric-item"><div class="metric-value">${metrics.f1_score || '98.52%'}</div><div class="metric-label">${this.t('metric_f1')}</div></div>
                    <div class="metric-item"><div class="metric-value">${metrics.auc_roc || '0.9928'}</div><div class="metric-label">${this.t('metric_auc')}</div></div>
                    <div class="metric-item"><div class="metric-value">${metrics.training_samples || '28k+'}</div><div class="metric-label">${this.t('model_training')}</div></div>
                </div>
            </div>
        `;
    }

    getRecommendation(isReal, confidence) {
        if (isReal) {
            if (confidence >= 0.9) return this.t('rec_real_high');
            else if (confidence >= 0.7) return this.t('rec_real_medium');
            else return this.t('rec_real_low');
        } else {
            if (confidence >= 0.9) return this.t('rec_fake_high');
            else if (confidence >= 0.7) return this.t('rec_fake_medium');
            else return this.t('rec_fake_low');
        }
    }

    animateResults() {
        setTimeout(() => {
            document.querySelectorAll('.prob-fill').forEach(bar => {
                const width = bar.style.width;
                bar.style.width = '0%';
                setTimeout(() => { bar.style.width = width; }, 100);
            });
        }, 200);

        document.querySelectorAll('.timeline-bar').forEach((bar, index) => {
            const height = bar.style.height;
            bar.style.height = '0%';
            setTimeout(() => { bar.style.height = height; }, 50 + index * 30);
        });
    }
}

window.resultsDisplay = new ResultsDisplay();
