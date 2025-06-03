/**
 * Performance Management - 성능 관리 모듈
 * @author Employee Test System
 * @version 1.0.0
 */

const Performance = (() => {
    'use strict';

    let config = {
        enableMonitoring: false,
        enableLazyLoading: true,
        enableMemoryMonitoring: false
    };

    /**
     * 성능 모니터링 초기화
     * @param {Object} options 
     */
    function init(options = {}) {
        config = { ...config, ...options };

        if (config.enableMonitoring) {
            Monitor.init();
        }

        if (config.enableLazyLoading) {
            LazyLoader.init();
        }

        if (config.enableMemoryMonitoring) {
            MemoryMonitor.init();
        }

        Loader.init();
    }

    /**
     * 성능 모니터링
     */
    const Monitor = {
        metrics: {},

        init() {
            this.measureWebVitals();
            this.trackNavigation();
            this.setupErrorTracking();
        },

        /**
         * Core Web Vitals 측정
         */
        measureWebVitals() {
            // First Contentful Paint (FCP)
            if ('PerformanceObserver' in window) {
                new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                        if (entry.name === 'first-contentful-paint') {
                            this.recordMetric('FCP', entry.startTime);
                        }
                    }
                }).observe({ entryTypes: ['paint'] });

                // Largest Contentful Paint (LCP)
                new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    const lastEntry = entries[entries.length - 1];
                    this.recordMetric('LCP', lastEntry.startTime);
                }).observe({ entryTypes: ['largest-contentful-paint'] });

                // First Input Delay (FID)
                new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                        const delay = entry.processingStart - entry.startTime;
                        this.recordMetric('FID', delay);
                    }
                }).observe({ entryTypes: ['first-input'] });

                // Cumulative Layout Shift (CLS)
                let clsValue = 0;
                new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                        if (!entry.hadRecentInput) {
                            clsValue += entry.value;
                            this.recordMetric('CLS', clsValue);
                        }
                    }
                }).observe({ entryTypes: ['layout-shift'] });
            }
        },

        /**
         * 네비게이션 타이밍 추적
         */
        trackNavigation() {
            window.addEventListener('load', () => {
                setTimeout(() => {
                    const navigation = performance.getEntriesByType('navigation')[0];
                    if (navigation) {
                        this.recordMetric('loadTime', navigation.loadEventEnd - navigation.fetchStart);
                        this.recordMetric('domReady', navigation.domContentLoadedEventEnd - navigation.fetchStart);
                        this.recordMetric('ttfb', navigation.responseStart - navigation.requestStart);
                    }
                }, 0);
            });
        },

        /**
         * 에러 추적
         */
        setupErrorTracking() {
            window.addEventListener('error', (event) => {
                const errorInfo = {
                    message: event.message,
                    source: event.filename,
                    line: event.lineno,
                    column: event.colno,
                    timestamp: new Date().toISOString()
                };
                this.recordError(errorInfo);
            });

            window.addEventListener('unhandledrejection', (event) => {
                const errorInfo = {
                    type: 'unhandledRejection',
                    reason: event.reason,
                    timestamp: new Date().toISOString()
                };
                this.recordError(errorInfo);
            });
        },

        /**
         * 메트릭 기록
         * @param {string} name 
         * @param {number} value 
         */
        recordMetric(name, value) {
            this.metrics[name] = value;
            console.log(`Performance Metric - ${name}:`, value.toFixed(2), 'ms');

            // 로컬 스토리지에 저장
            const metrics = Core.Storage.get('performanceMetrics', []);
            metrics.push({
                name,
                value,
                timestamp: new Date().toISOString(),
                url: window.location.href
            });

            // 최근 100개만 유지
            if (metrics.length > 100) {
                metrics.shift();
            }

            Core.Storage.set('performanceMetrics', metrics);
        },

        /**
         * 에러 기록
         * @param {Object} errorInfo 
         */
        recordError(errorInfo) {
            console.error('Performance Error:', errorInfo);

            const errors = Core.Storage.get('performanceErrors', []);
            errors.push(errorInfo);

            // 최근 50개만 유지
            if (errors.length > 50) {
                errors.shift();
            }

            Core.Storage.set('performanceErrors', errors);
        },

        /**
         * 메트릭 조회
         * @returns {Object}
         */
        getMetrics() {
            return { ...this.metrics };
        }
    };

    /**
     * 지연 로딩
     */
    const LazyLoader = {
        observers: new Map(),

        init() {
            this.setupImageLazyLoading();
            this.setupScriptLazyLoading();
        },

        /**
         * 이미지 지연 로딩 설정
         */
        setupImageLazyLoading() {
            if ('IntersectionObserver' in window) {
                const imageObserver = new IntersectionObserver((entries) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            const img = entry.target;
                            if (img.dataset.src) {
                                img.src = img.dataset.src;
                                img.classList.add('loaded');
                                imageObserver.unobserve(img);
                            }
                        }
                    });
                }, {
                    rootMargin: '50px 0px',
                    threshold: 0.01
                });

                this.observers.set('images', imageObserver);

                // 기존 이미지에 적용
                this.observeImages();

                // 새로 추가되는 이미지 감지
                this.setupMutationObserver();
            } else {
                // 폴백: 즉시 로드
                this.loadAllImages();
            }
        },

        /**
         * 이미지 관찰 시작
         */
        observeImages() {
            const observer = this.observers.get('images');
            if (observer) {
                document.querySelectorAll('img[data-src]').forEach(img => {
                    observer.observe(img);
                });
            }
        },

        /**
         * 모든 이미지 즉시 로드 (폴백)
         */
        loadAllImages() {
            document.querySelectorAll('img[data-src]').forEach(img => {
                img.src = img.dataset.src;
                img.classList.add('loaded');
            });
        },

        /**
         * DOM 변화 감지
         */
        setupMutationObserver() {
            const mutationObserver = new MutationObserver((mutations) => {
                mutations.forEach(mutation => {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === 1) { // Element node
                            const images = node.querySelectorAll ? node.querySelectorAll('img[data-src]') : [];
                            images.forEach(img => {
                                const observer = this.observers.get('images');
                                if (observer) {
                                    observer.observe(img);
                                }
                            });
                        }
                    });
                });
            });

            mutationObserver.observe(document.body, {
                childList: true,
                subtree: true
            });
        },

        /**
         * 스크립트 지연 로딩
         */
        setupScriptLazyLoading() {
            // 특정 조건에서만 스크립트 로드
            this.conditionalScriptLoading();
        },

        /**
         * 조건부 스크립트 로딩
         */
        conditionalScriptLoading() {
            // 큰 화면에서만 추가 기능 로드
            if (window.matchMedia('(min-width: 1024px)').matches) {
                this.loadScript('/js/desktop-features.js').catch(() => { });
            }

            // 터치 디바이스에서만 터치 이벤트 로드
            if ('ontouchstart' in window) {
                this.loadScript('/js/touch-events.js').catch(() => { });
            }
        },

        /**
         * 동적 스크립트 로딩
         * @param {string} src 
         * @returns {Promise}
         */
        loadScript(src) {
            return new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = src;
                script.async = true;
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
            });
        }
    };

    /**
     * 메모리 모니터링
     */
    const MemoryMonitor = {
        interval: null,

        init() {
            if (performance.memory) {
                this.startMonitoring();
            }
        },

        startMonitoring() {
            this.interval = setInterval(() => {
                const memoryInfo = {
                    used: Math.round(performance.memory.usedJSHeapSize / 1048576 * 100) / 100,
                    total: Math.round(performance.memory.totalJSHeapSize / 1048576 * 100) / 100,
                    limit: Math.round(performance.memory.jsHeapSizeLimit / 1048576 * 100) / 100
                };

                console.log('Memory Usage:', memoryInfo);

                // 메모리 사용량이 한계의 80%를 넘으면 경고
                if (memoryInfo.used / memoryInfo.limit > 0.8) {
                    this.handleHighMemoryUsage();
                }
            }, 30000); // 30초마다 체크
        },

        handleHighMemoryUsage() {
            console.warn('High memory usage detected');
            // 필요한 정리 작업 수행
            this.cleanup();
        },

        cleanup() {
            // 사용하지 않는 데이터 정리
            const keys = Object.keys(localStorage);
            keys.forEach(key => {
                if (key.startsWith('temp_') || key.startsWith('cache_')) {
                    const item = Core.Storage.get(key);
                    if (item && item.timestamp) {
                        const age = Date.now() - new Date(item.timestamp).getTime();
                        if (age > 24 * 60 * 60 * 1000) { // 24시간 이상 된 데이터
                            Core.Storage.remove(key);
                        }
                    }
                }
            });
        },

        stop() {
            if (this.interval) {
                clearInterval(this.interval);
                this.interval = null;
            }
        }
    };

    /**
     * 리소스 로더
     */
    const Loader = {
        cache: new Map(),

        init() {
            this.preloadCriticalResources();
        },

        /**
         * 크리티컬 리소스 프리로드
         */
        preloadCriticalResources() {
            const criticalResources = [
                { href: '/common.css', as: 'style' },
                { href: '/images/logo.png', as: 'image' }
            ];

            criticalResources.forEach(resource => {
                this.preload(resource.href, resource.as);
            });
        },

        /**
         * 리소스 프리로드
         * @param {string} href 
         * @param {string} as 
         */
        preload(href, as) {
            if (this.cache.has(href)) return;

            const link = document.createElement('link');
            link.rel = 'preload';
            link.href = href;
            link.as = as;

            link.onload = () => {
                this.cache.set(href, { loaded: true, timestamp: Date.now() });
            };

            link.onerror = () => {
                console.warn(`Failed to preload: ${href}`);
            };

            document.head.appendChild(link);
        },

        /**
         * CSS 동적 로딩
         * @param {string} href 
         * @returns {Promise}
         */
        loadCSS(href) {
            return new Promise((resolve, reject) => {
                if (this.cache.has(href)) {
                    resolve();
                    return;
                }

                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = href;
                link.media = 'only x'; // 초기에는 적용되지 않도록

                link.onload = () => {
                    link.media = 'all'; // 로드 완료 후 적용
                    this.cache.set(href, { loaded: true, timestamp: Date.now() });
                    resolve();
                };

                link.onerror = reject;
                document.head.appendChild(link);
            });
        },

        /**
         * 페이지별 리소스 로딩
         * @param {string} pageName 
         * @returns {Promise}
         */
        async loadPageResources(pageName) {
            const pageResources = {
                'test': [
                    { href: '/css/test.css', type: 'css' },
                    { href: '/js/test.js', type: 'script' }
                ],
                'result': [
                    { href: '/css/result.css', type: 'css' },
                    { href: '/js/result.js', type: 'script' }
                ],
                'mypage': [
                    { href: '/css/mypage.css', type: 'css' },
                    { href: '/js/mypage.js', type: 'script' }
                ]
            };

            const resources = pageResources[pageName] || [];
            const promises = resources.map(resource => {
                if (resource.type === 'css') {
                    return this.loadCSS(resource.href).catch(error => {
                        console.warn(`Failed to load CSS: ${resource.href}`, error);
                        return Promise.resolve(); // CSS 로딩 실패해도 계속 진행
                    });
                } else if (resource.type === 'script') {
                    return LazyLoader.loadScript(resource.href).catch(error => {
                        console.warn(`Failed to load script: ${resource.href}`, error);
                        return Promise.resolve(); // 스크립트 로딩 실패해도 계속 진행
                    });
                }
                return Promise.resolve();
            });

            try {
                await Promise.all(promises);
                console.log(`Successfully loaded resources for page: ${pageName}`);
            } catch (error) {
                console.warn(`Some resources failed to load for page: ${pageName}`, error);
                // 일부 리소스 로딩 실패해도 진행
            }
        }
    };

    // Public API
    return {
        init,
        Monitor,
        LazyLoader,
        MemoryMonitor,
        Loader
    };
})();

// 전역 스코프에 노출
window.Performance = Performance; 