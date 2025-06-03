/**
 * UI Utilities - UI 관련 유틸리티 모듈
 * @author Employee Test System
 * @version 1.0.0
 */

const UI = (() => {
    'use strict';

    /**
     * 알림 시스템
     */
    const Notification = {
        /**
         * 알림 표시
         * @param {string} message 
         * @param {string} type 
         * @param {number} duration 
         */
        show(message, type = 'info', duration = 3000) {
            const notification = Core.DOM.create('div', {
                className: `notification notification--${type}`,
                'data-type': type
            });

            const icon = this.getIcon(type);
            notification.innerHTML = `
                <div class="notification__content">
                    <span class="notification__icon">${icon}</span>
                    <span class="notification__message">${message}</span>
                </div>
            `;

            this.addStyles(notification, type);
            document.body.appendChild(notification);

            // 애니메이션
            requestAnimationFrame(() => {
                notification.style.transform = 'translateX(0)';
                notification.style.opacity = '1';
            });

            // 자동 제거
            setTimeout(() => {
                this.hide(notification);
            }, duration);

            return notification;
        },

        /**
         * 알림 숨기기
         * @param {Element} notification 
         */
        hide(notification) {
            notification.style.transform = 'translateX(100%)';
            notification.style.opacity = '0';

            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        },

        /**
         * 타입별 아이콘 반환
         * @param {string} type 
         * @returns {string}
         */
        getIcon(type) {
            const icons = {
                success: '✅',
                error: '❌',
                warning: '⚠️',
                info: 'ℹ️'
            };
            return icons[type] || icons.info;
        },

        /**
         * 알림 스타일 적용
         * @param {Element} notification 
         * @param {string} type 
         */
        addStyles(notification, type) {
            const colors = {
                success: '#10b981',
                error: '#ef4444',
                warning: '#f59e0b',
                info: '#3b82f6'
            };

            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: ${colors[type] || colors.info};
                color: white;
                padding: 1rem 1.5rem;
                border-radius: 8px;
                box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
                transform: translateX(100%);
                opacity: 0;
                transition: all 0.3s ease;
                z-index: 10000;
                max-width: 320px;
                font-weight: 500;
            `;
        }
    };

    /**
     * 모달 시스템
     */
    const Modal = {
        /**
         * 확인 모달
         * @param {string} message 
         * @param {string} title 
         * @returns {Promise<boolean>}
         */
        confirm(message, title = '확인') {
            return new Promise((resolve) => {
                const modal = this.create({
                    title,
                    content: `<p style="margin: 0; line-height: 1.6;">${message}</p>`,
                    buttons: [
                        {
                            text: '취소',
                            variant: 'secondary',
                            onClick: () => {
                                this.close(modal);
                                resolve(false);
                            }
                        },
                        {
                            text: '확인',
                            variant: 'primary',
                            onClick: () => {
                                this.close(modal);
                                resolve(true);
                            }
                        }
                    ]
                });
            });
        },

        /**
         * 알림 모달
         * @param {string} message 
         * @param {string} title 
         * @returns {Promise<void>}
         */
        alert(message, title = '알림') {
            return new Promise((resolve) => {
                const modal = this.create({
                    title,
                    content: `<p style="margin: 0; line-height: 1.6;">${message}</p>`,
                    buttons: [
                        {
                            text: '확인',
                            variant: 'primary',
                            onClick: () => {
                                this.close(modal);
                                resolve();
                            }
                        }
                    ]
                });
            });
        },

        /**
         * 모달 생성
         * @param {Object} options 
         * @returns {Element}
         */
        create(options) {
            const { title, content, buttons = [] } = options;

            const overlay = Core.DOM.create('div', { className: 'modal-overlay' });
            const modal = Core.DOM.create('div', { className: 'modal' });

            modal.innerHTML = `
                <div class="modal__header">
                    <h3 class="modal__title">${title}</h3>
                </div>
                <div class="modal__content">
                    ${content}
                </div>
                <div class="modal__footer">
                    ${buttons.map(btn =>
                `<button class="btn btn--${btn.variant}" data-action="${btn.text}">${btn.text}</button>`
            ).join('')}
                </div>
            `;

            overlay.appendChild(modal);
            this.addModalStyles(overlay, modal);
            document.body.appendChild(overlay);

            // 버튼 이벤트 등록
            buttons.forEach(btn => {
                const buttonEl = modal.querySelector(`[data-action="${btn.text}"]`);
                if (buttonEl) {
                    Core.EventManager.on(buttonEl, 'click', btn.onClick);
                }
            });

            // 오버레이 클릭 시 닫기
            Core.EventManager.on(overlay, 'click', (e) => {
                if (e.target === overlay) {
                    this.close(overlay);
                }
            });

            // 애니메이션
            requestAnimationFrame(() => {
                overlay.style.opacity = '1';
                modal.style.transform = 'scale(1)';
            });

            return overlay;
        },

        /**
         * 모달 닫기
         * @param {Element} modal 
         */
        close(modal) {
            const overlay = modal.classList.contains('modal-overlay') ? modal : modal.closest('.modal-overlay');
            if (!overlay) return;

            overlay.style.opacity = '0';
            const modalEl = overlay.querySelector('.modal');
            if (modalEl) {
                modalEl.style.transform = 'scale(0.9)';
            }

            setTimeout(() => {
                if (overlay.parentNode) {
                    overlay.parentNode.removeChild(overlay);
                }
            }, 200);
        },

        /**
         * 모달 스타일 적용
         * @param {Element} overlay 
         * @param {Element} modal 
         */
        addModalStyles(overlay, modal) {
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10001;
                opacity: 0;
                transition: opacity 0.2s ease;
            `;

            modal.style.cssText = `
                background: white;
                border-radius: 12px;
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
                max-width: 400px;
                width: 90%;
                max-height: 80vh;
                overflow: auto;
                transform: scale(0.9);
                transition: transform 0.2s ease;
            `;

            // 헤더 스타일
            const header = modal.querySelector('.modal__header');
            if (header) {
                header.style.cssText = `
                    padding: 1.5rem 1.5rem 1rem;
                    border-bottom: 1px solid #e5e7eb;
                `;
            }

            // 타이틀 스타일
            const title = modal.querySelector('.modal__title');
            if (title) {
                title.style.cssText = `
                    margin: 0;
                    font-size: 1.25rem;
                    font-weight: 600;
                    color: #111827;
                `;
            }

            // 콘텐츠 스타일
            const content = modal.querySelector('.modal__content');
            if (content) {
                content.style.cssText = `
                    padding: 1rem 1.5rem;
                    color: #374151;
                `;
            }

            // 푸터 스타일
            const footer = modal.querySelector('.modal__footer');
            if (footer) {
                footer.style.cssText = `
                    padding: 1rem 1.5rem 1.5rem;
                    display: flex;
                    gap: 0.75rem;
                    justify-content: flex-end;
                `;
            }

            // 버튼 스타일
            modal.querySelectorAll('.btn').forEach(btn => {
                btn.style.cssText = `
                    padding: 0.5rem 1rem;
                    border-radius: 6px;
                    font-weight: 500;
                    border: none;
                    cursor: pointer;
                    transition: all 0.2s ease;
                `;

                if (btn.classList.contains('btn--primary')) {
                    btn.style.background = '#3b82f6';
                    btn.style.color = 'white';
                } else {
                    btn.style.background = '#f3f4f6';
                    btn.style.color = '#374151';
                }
            });
        }
    };

    /**
     * 로딩 시스템
     */
    const Loading = {
        element: null,

        /**
         * 로딩 표시
         * @param {string} message 
         */
        show(message = '로딩 중...') {
            if (this.element) return;

            this.element = Core.DOM.create('div', { className: 'loading-overlay' });
            this.element.innerHTML = `
                <div class="loading__content">
                    <div class="loading__spinner"></div>
                    <div class="loading__message">${message}</div>
                </div>
            `;

            this.addLoadingStyles();
            document.body.appendChild(this.element);

            requestAnimationFrame(() => {
                this.element.style.opacity = '1';
            });
        },

        /**
         * 로딩 숨기기
         */
        hide() {
            if (!this.element) return;

            this.element.style.opacity = '0';
            setTimeout(() => {
                if (this.element && this.element.parentNode) {
                    this.element.parentNode.removeChild(this.element);
                    this.element = null;
                }
            }, 200);
        },

        /**
         * 로딩 스타일 적용
         */
        addLoadingStyles() {
            this.element.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(255, 255, 255, 0.9);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10002;
                opacity: 0;
                transition: opacity 0.2s ease;
            `;

            const content = this.element.querySelector('.loading__content');
            if (content) {
                content.style.cssText = `
                    text-align: center;
                    color: #374151;
                `;
            }

            const spinner = this.element.querySelector('.loading__spinner');
            if (spinner) {
                spinner.style.cssText = `
                    width: 40px;
                    height: 40px;
                    border: 4px solid #e5e7eb;
                    border-top: 4px solid #3b82f6;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin: 0 auto 1rem;
                `;

                // 애니메이션 키프레임 추가
                const style = document.createElement('style');
                style.textContent = `
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `;
                document.head.appendChild(style);
            }

            const message = this.element.querySelector('.loading__message');
            if (message) {
                message.style.cssText = `
                    font-size: 1rem;
                    font-weight: 500;
                `;
            }
        }
    };

    /**
     * 애니메이션 유틸리티
     */
    const Animation = {
        /**
         * 페이드 인
         * @param {Element} element 
         * @param {number} duration 
         */
        fadeIn(element, duration = 300) {
            element.style.opacity = '0';
            element.style.transition = `opacity ${duration}ms ease`;

            requestAnimationFrame(() => {
                element.style.opacity = '1';
            });
        },

        /**
         * 페이드 아웃
         * @param {Element} element 
         * @param {number} duration 
         */
        fadeOut(element, duration = 300) {
            element.style.transition = `opacity ${duration}ms ease`;
            element.style.opacity = '0';

            setTimeout(() => {
                element.style.display = 'none';
            }, duration);
        },

        /**
         * 슬라이드 업
         * @param {Element} element 
         * @param {number} duration 
         */
        slideUp(element, duration = 300) {
            element.style.transform = 'translateY(20px)';
            element.style.opacity = '0';
            element.style.transition = `all ${duration}ms ease`;

            requestAnimationFrame(() => {
                element.style.transform = 'translateY(0)';
                element.style.opacity = '1';
            });
        }
    };

    // Public API
    return {
        Notification,
        Modal,
        Loading,
        Animation
    };
})();

// 전역 스코프에 노출
window.UI = UI; 