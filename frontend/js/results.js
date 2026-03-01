/**
 * DeepGuard Results Display - Enhanced Version with FULL i18n & SVG Icons
 * All dynamic text is now translated via i18n keys instead of using backend English strings.
 */

class ResultsDisplay {
    constructor() {
        this.animationDuration = 800;
        // Store last results so we can re-translate when language changes
        this._lastImageResult = null;
        this._lastVideoResult = null;
    }

    t(key) {
        return window.i18n ? window.i18n.t(key) : key;
    }

    icon(name, size = 20) {
        return window.getIcon ? window.getIcon(name, size) : '';
    }

    displayImageResults(result) {
        console.log('Displaying image results:', result);
        this._lastImageResult = result;

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
        this._lastVideoResult = result;

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

    // ═══════════════════════════════════════════════════════════════════
    // TRANSLATED CONFIDENCE INTERPRETATION
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Returns translated confidence interpretation instead of using backend English text.
     */
    getTranslatedConfidenceInterpretation(confidence) {
        let labelKey, descKey, color;

        if (confidence >= 0.95) {
            labelKey = 'conf_very_high';
            descKey = 'conf_desc_very_high';
            color = '#10B981';
        } else if (confidence >= 0.85) {
            labelKey = 'conf_high';
            descKey = 'conf_desc_high';
            color = '#34D399';
        } else if (confidence >= 0.70) {
            labelKey = 'conf_moderate';
            descKey = 'conf_desc_moderate';
            color = '#F59E0B';
        } else if (confidence >= 0.55) {
            labelKey = 'conf_low';
            descKey = 'conf_desc_low';
            color = '#EF4444';
        } else {
            labelKey = 'conf_uncertain';
            descKey = 'conf_desc_uncertain';
            color = '#6B7280';
        }

        return {
            label: this.t(labelKey),
            description: this.t(descKey),
            color: color
        };
    }

    // ═══════════════════════════════════════════════════════════════════
    // TRANSLATED KEY POINTS & TECHNICAL DETAILS
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Generates translated key points based on the structured data from the API,
     * instead of displaying the raw English strings from the backend.
     */
    getTranslatedKeyPoints(isFake, explainability) {
        const stats = explainability?.attention_stats || {};
        const regions = explainability?.suspicious_regions || [];
        const keyPoints = [];

        if (isFake) {
            if (stats.high_attention_ratio > 0.3) {
                keyPoints.push(this.t('kp_fake_extensive_anomalies'));
            }
            if (regions.length > 2) {
                keyPoints.push(`${regions.length} ${this.t('kp_fake_suspicious_regions')}`);
            }
            if (stats.max_activation > 0.9) {
                keyPoints.push(this.t('kp_fake_high_artifacts'));
            }
            if (keyPoints.length === 0) {
                keyPoints.push(this.t('kp_fake_subtle_patterns'));
            }
        } else {
            if (stats.mean_activation < 0.3) {
                keyPoints.push(this.t('kp_real_no_anomalies'));
            }
            if (stats.std_activation < 0.2) {
                keyPoints.push(this.t('kp_real_consistent_texture'));
            }
            if (keyPoints.length === 0) {
                keyPoints.push(this.t('kp_real_authentic'));
            }
        }

        return keyPoints;
    }

    /**
     * Returns translated technical details.
     */
    getTranslatedTechnicalDetails(isFake) {
        if (isFake) {
            return [
                this.t('td_fake_gan'),
                this.t('td_fake_boundaries'),
                this.t('td_fake_texture'),
                this.t('td_fake_symmetry')
            ];
        } else {
            return [
                this.t('td_real_texture'),
                this.t('td_real_lighting'),
                this.t('td_real_resolution'),
                this.t('td_real_proportions')
            ];
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // TRANSLATED VIDEO INTERPRETATION
    // ═══════════════════════════════════════════════════════════════════

    getTranslatedVideoKeyPoints(result) {
        const stats = result.analysis_stats || {};
        const fakeCount = stats.frames_predicted_fake || 0;
        const realCount = stats.frames_predicted_real || 0;
        const total = fakeCount + realCount;
        const isFake = result.is_deepfake;
        const temporal = result.interpretation?.temporal_analysis || {};

        const keyPoints = [];

        if (isFake) {
            if (total > 0 && fakeCount / total > 0.8) {
                keyPoints.push(this.t('vi_fake_entire'));
            } else if (total > 0 && fakeCount / total > 0.5) {
                keyPoints.push(this.t('vi_fake_majority'));
            } else {
                keyPoints.push(this.t('vi_fake_partial'));
            }

            if (temporal.has_suspicious_segments) {
                keyPoints.push(`${this.t('vi_fake_segments')} ${temporal.suspicious_segments_count}`);
            }
        } else {
            if (total > 0 && realCount / total > 0.9) {
                keyPoints.push(this.t('vi_real_clean'));
            } else {
                keyPoints.push(this.t('vi_real_ambiguous'));
            }
        }

        return keyPoints;
    }

    getTranslatedVideoConfidenceLevel(confidence) {
        if (confidence >= 0.9) {
            return { label: this.t('vi_conf_very_high'), color: '#10B981' };
        } else if (confidence >= 0.75) {
            return { label: this.t('vi_conf_high'), color: '#34D399' };
        } else if (confidence >= 0.6) {
            return { label: this.t('vi_conf_moderate'), color: '#F59E0B' };
        } else {
            return { label: this.t('vi_conf_low'), color: '#EF4444' };
        }
    }

    getTranslatedVideoRecommendation(isFake, confidence, fakeCount, total) {
        if (isFake) {
            if (confidence >= 0.85 && total > 0 && fakeCount / total > 0.7) {
                return this.t('vi_rec_fake_high');
            } else if (confidence >= 0.7) {
                return this.t('vi_rec_fake_medium');
            } else {
                return this.t('vi_rec_fake_low');
            }
        } else {
            if (confidence >= 0.85) {
                return this.t('vi_rec_real_high');
            } else if (confidence >= 0.7) {
                return this.t('vi_rec_real_medium');
            } else {
                return this.t('vi_rec_real_low');
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // HTML GENERATION
    // ═══════════════════════════════════════════════════════════════════

    generateExplainabilityHTML(result) {
        const explainability = result.explainability || {};
        const confidence = result.confidence;
        const isReal = !result.is_deepfake;
        const isFake = result.is_deepfake;

        // Get translated confidence interpretation
        const confInterp = this.getTranslatedConfidenceInterpretation(confidence);

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
                <div class="confidence-interpretation">
                    <div class="confidence-level" style="color: ${confInterp.color}">${confInterp.label}</div>
                    <div class="confidence-desc">${confInterp.description}</div>
                </div>
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

        // Key findings — TRANSLATED (not from backend)
        const keyPoints = this.getTranslatedKeyPoints(isFake, explainability);
        const technicalDetails = this.getTranslatedTechnicalDetails(isFake);

        html += `
            <div class="explain-card">
                <h4>${this.icon('sparkles', 20)} ${this.t('explain_findings')}</h4>
                <div class="key-points-list">
                    ${keyPoints.map(point => `
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
                    ${technicalDetails.map(detail => `<div class="tech-detail">${detail}</div>`).join('')}
                </div>
            </div>
        `;

        html += '</div>';

        // Recommendation — TRANSLATED
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
                                : `<div class="frame-image" style="background:var(--bg-secondary);display:flex;align-items:center;justify-content:center;">${this.t('no_thumbnail')}</div>`
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
        const stats = result.analysis_stats || {};
        const isFake = result.is_deepfake;
        const confidence = result.confidence;
        const fakeCount = stats.frames_predicted_fake || 0;
        const total = (stats.frames_predicted_fake || 0) + (stats.frames_predicted_real || 0);

        // Translated key points (instead of backend English)
        const keyPoints = this.getTranslatedVideoKeyPoints(result);
        // Translated recommendation (instead of backend English)
        const recommendation = this.getTranslatedVideoRecommendation(isFake, confidence, fakeCount, total);

        return `
            <div class="explain-card">
                <h4>${this.icon('video', 20)} ${this.t('video_info')}</h4>
                <div class="video-stats">
                    <div class="video-stat"><div class="video-stat-value">${metadata.duration_seconds?.toFixed(1) || 0}s</div><div class="video-stat-label">${this.t('video_duration')}</div></div>
                    <div class="video-stat"><div class="video-stat-value">${metadata.fps?.toFixed(0) || 0}</div><div class="video-stat-label">${this.t('video_fps')}</div></div>
                    <div class="video-stat"><div class="video-stat-value">${metadata.resolution || 'N/A'}</div><div class="video-stat-label">${this.t('video_resolution')}</div></div>
                </div>
            </div>
            ${keyPoints.length > 0 ? `
                <div class="explain-card">
                    <h4>${this.icon('sparkles', 20)} ${this.t('explain_findings')}</h4>
                    <div class="key-points-list">
                        ${keyPoints.map(point => `
                            <div class="key-point"><span class="key-point-icon">${this.icon('info', 16)}</span><span class="key-point-text">${point}</span></div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
            <div class="recommendation-section">
                <h4>${this.icon('info', 20)} ${this.t('explain_recommendation')}</h4>
                <p class="recommendation-text">${recommendation}</p>
            </div>
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
