/**
 * Core Utilities - 핵심 유틸리티 모듈
 * @author Employee Test System
 * @version 1.0.0
 */

const Core = (() => {
    'use strict';

    /**
     * DOM 조작 유틸리티
     */
    const DOM = {
        /**
         * DOM이 준비될 때까지 기다림
         * @param {Function} callback 
         */
        ready(callback) {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', callback);
            } else {
                callback();
            }
        },

        /**
         * 요소 선택
         * @param {string} selector 
         * @returns {Element|null}
         */
        $(selector) {
            return document.querySelector(selector);
        },

        /**
         * 요소들 선택
         * @param {string} selector 
         * @returns {NodeList}
         */
        $$(selector) {
            return document.querySelectorAll(selector);
        },

        /**
         * 요소 생성
         * @param {string} tag 
         * @param {Object} attrs 
         * @param {string} content 
         * @returns {Element}
         */
        create(tag, attrs = {}, content = '') {
            const el = document.createElement(tag);

            Object.entries(attrs).forEach(([key, value]) => {
                if (key === 'className') {
                    el.className = value;
                } else if (key === 'textContent') {
                    el.textContent = value;
                } else {
                    el.setAttribute(key, value);
                }
            });

            if (content) {
                el.innerHTML = content;
            }

            return el;
        }
    };

    /**
     * 이벤트 관리자
     */
    const EventManager = {
        /**
         * 이벤트 리스너 추가
         * @param {Element} element 
         * @param {string} event 
         * @param {Function} handler 
         * @param {Object} options 
         */
        on(element, event, handler, options = {}) {
            if (!element) return;
            element.addEventListener(event, handler, options);
        },

        /**
         * 이벤트 리스너 제거
         * @param {Element} element 
         * @param {string} event 
         * @param {Function} handler 
         */
        off(element, event, handler) {
            if (!element) return;
            element.removeEventListener(event, handler);
        },

        /**
         * 일회성 이벤트 리스너
         * @param {Element} element 
         * @param {string} event 
         * @param {Function} handler 
         */
        once(element, event, handler) {
            this.on(element, event, handler, { once: true });
        },

        /**
         * 이벤트 위임
         * @param {Element} parent 
         * @param {string} selector 
         * @param {string} event 
         * @param {Function} handler 
         */
        delegate(parent, selector, event, handler) {
            this.on(parent, event, (e) => {
                const target = e.target.closest(selector);
                if (target) {
                    handler.call(target, e);
                }
            });
        }
    };

    /**
     * 로컬 스토리지 관리자
     */
    const Storage = {
        /**
         * 데이터 저장
         * @param {string} key 
         * @param {*} value 
         * @returns {boolean}
         */
        set(key, value) {
            try {
                localStorage.setItem(key, JSON.stringify(value));
                return true;
            } catch (error) {
                console.error('Storage set error:', error);
                return false;
            }
        },

        /**
         * 데이터 조회
         * @param {string} key 
         * @param {*} defaultValue 
         * @returns {*}
         */
        get(key, defaultValue = null) {
            try {
                const item = localStorage.getItem(key);
                return item ? JSON.parse(item) : defaultValue;
            } catch (error) {
                console.error('Storage get error:', error);
                return defaultValue;
            }
        },

        /**
         * 데이터 삭제
         * @param {string} key 
         * @returns {boolean}
         */
        remove(key) {
            try {
                localStorage.removeItem(key);
                return true;
            } catch (error) {
                console.error('Storage remove error:', error);
                return false;
            }
        },

        /**
         * 모든 데이터 삭제
         */
        clear() {
            try {
                localStorage.clear();
                return true;
            } catch (error) {
                console.error('Storage clear error:', error);
                return false;
            }
        }
    };

    /**
     * HTTP 요청 관리자
     */
    const Http = {
        baseURL: window.location.hostname === 'localhost' ? 'http://localhost:3000' : '',

        /**
         * HTTP 요청
         * @param {string} method 
         * @param {string} url 
         * @param {Object} data 
         * @param {Object} options 
         * @returns {Promise}
         */
        async request(method, url, data = null, options = {}) {
            try {
                const config = {
                    method,
                    headers: {
                        'Content-Type': 'application/json',
                        ...options.headers
                    },
                    ...options
                };

                const token = Storage.get('authToken');
                if (token) {
                    config.headers['Authorization'] = `Bearer ${token}`;
                }

                if (data && ['POST', 'PUT', 'PATCH'].includes(method)) {
                    config.body = JSON.stringify(data);
                }

                const response = await fetch(`${this.baseURL}${url}`, config);

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                return await response.json();
            } catch (error) {
                console.error('HTTP request error:', error);
                throw error;
            }
        },

        /**
         * GET 요청
         * @param {string} url 
         * @param {Object} options 
         * @returns {Promise}
         */
        get(url, options = {}) {
            return this.request('GET', url, null, options);
        },

        /**
         * POST 요청
         * @param {string} url 
         * @param {Object} data 
         * @param {Object} options 
         * @returns {Promise}
         */
        post(url, data, options = {}) {
            return this.request('POST', url, data, options);
        },

        /**
         * PUT 요청
         * @param {string} url 
         * @param {Object} data 
         * @param {Object} options 
         * @returns {Promise}
         */
        put(url, data, options = {}) {
            return this.request('PUT', url, data, options);
        },

        /**
         * DELETE 요청
         * @param {string} url 
         * @param {Object} options 
         * @returns {Promise}
         */
        delete(url, options = {}) {
            return this.request('DELETE', url, null, options);
        }
    };

    /**
     * 유틸리티 함수들
     */
    const Utils = {
        /**
         * 디바운스
         * @param {Function} func 
         * @param {number} wait 
         * @returns {Function}
         */
        debounce(func, wait) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func.apply(this, args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        },

        /**
         * 스로틀
         * @param {Function} func 
         * @param {number} limit 
         * @returns {Function}
         */
        throttle(func, limit) {
            let inThrottle;
            return function executedFunction(...args) {
                if (!inThrottle) {
                    func.apply(this, args);
                    inThrottle = true;
                    setTimeout(() => inThrottle = false, limit);
                }
            };
        },

        /**
         * 딥 클론
         * @param {*} obj 
         * @returns {*}
         */
        deepClone(obj) {
            if (obj === null || typeof obj !== 'object') return obj;
            if (obj instanceof Date) return new Date(obj);
            if (obj instanceof Array) return obj.map(item => this.deepClone(item));
            if (typeof obj === 'object') {
                const clonedObj = {};
                for (const key in obj) {
                    clonedObj[key] = this.deepClone(obj[key]);
                }
                return clonedObj;
            }
        },

        /**
         * UUID 생성
         * @returns {string}
         */
        generateUUID() {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                const r = Math.random() * 16 | 0;
                const v = c === 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        }
    };

    // Public API
    return {
        DOM,
        EventManager,
        Storage,
        Http,
        Utils
    };
})();

// 전역 스코프에 노출
window.Core = Core; 