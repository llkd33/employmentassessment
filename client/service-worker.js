// service-worker.js - 오프라인 지원 및 캐싱

const CACHE_NAME = `employee-test-v${Date.now()}`; // 항상 새로운 캐시 버전
const isProduction = location.hostname !== 'localhost' && !location.hostname.includes('127.0.0.1');
const urlsToCache = [
    '/',
    '/index.html',
    '/login.html',
    '/signup.html',
    '/signup-form.html',
    '/test.html',
    '/result.html',
    '/mypage.html',
    '/offline.html',

    // CSS 파일들
    '/styles.css',
    '/common.css',
    '/login.css',
    '/signup.css',
    '/signup-form.css',
    '/test.css',
    '/result.css',
    '/mypage.css',

    // 새로운 모듈 구조 JavaScript 파일들
    '/utils/core.js',
    '/utils/ui.js',
    '/utils/performance.js',
    '/utils/user.js',
    '/components/header.js',

    // 기존 JavaScript 파일들
    '/script.js',

    // 이미지
    '/images/logo.png'
];

// 서비스 워커 설치
self.addEventListener('install', event => {
    console.log('Service Worker installing...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Cache opened successfully');
                return cache.addAll(urlsToCache.map(url => {
                    return new Request(url, { cache: 'no-cache' });
                }));
            })
            .catch(error => {
                console.error('Failed to cache resources:', error);
            })
    );

    // 즉시 활성화
    self.skipWaiting();
});

// 서비스 워커 활성화
self.addEventListener('activate', event => {
    console.log('Service Worker activating...');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            // 모든 클라이언트 제어
            return self.clients.claim();
        })
    );
});

// 네트워크 요청 가로채기
self.addEventListener('fetch', event => {
    const request = event.request;

    // API 요청은 항상 네트워크에서 가져오기 (서비스 워커 개입 없이)
    if (request.url.includes('/api/')) {
        event.respondWith(fetch(request));
        return;
    }

    // POST 요청은 네트워크만 사용 (서비스 워커 개입 없이)
    if (request.method === 'POST') {
        event.respondWith(fetch(request));
        return;
    }

    // 개발 환경: Network First (항상 최신 파일 우선)
    // 프로덕션 환경: Cache First (캐시 우선)
    if (!isProduction) {
        // 개발 환경: Network First 전략
        event.respondWith(
            fetch(request)
                .then(networkResponse => {
                    // 네트워크 응답이 성공적이면 캐시 업데이트하고 반환
                    if (networkResponse && networkResponse.status === 200) {
                        const responseToCache = networkResponse.clone();
                        caches.open(CACHE_NAME)
                            .then(cache => {
                                if (request.url.startsWith('http')) {
                                    cache.put(request, responseToCache);
                                }
                            })
                            .catch(error => console.warn('Failed to cache response:', error));
                    }
                    return networkResponse;
                })
                .catch(() => {
                    // 네트워크 실패 시 캐시에서 가져오기
                    console.log('Network failed, trying cache:', request.url);
                    return caches.match(request)
                        .then(response => {
                            if (response) {
                                console.log('Serving from cache (fallback):', request.url);
                                return response;
                            }
                            // HTML 문서 요청이면 오프라인 페이지 반환
                            if (request.destination === 'document') {
                                return caches.match('/offline.html');
                            }
                            return new Response('', { status: 404 });
                        });
                })
        );
    } else {
        // 프로덕션 환경: 중요한 파일은 Network First, 이미지는 Cache First
        const isImportantFile = request.url.includes('.html') ||
            request.url.includes('.css') ||
            request.url.includes('.js') ||
            request.url.endsWith('/');

        if (isImportantFile) {
            // HTML, CSS, JS 파일은 Network First (항상 최신 버전 확인)
            event.respondWith(
                fetch(request)
                    .then(networkResponse => {
                        if (networkResponse && networkResponse.status === 200) {
                            const responseToCache = networkResponse.clone();
                            caches.open(CACHE_NAME)
                                .then(cache => {
                                    if (request.url.startsWith('http')) {
                                        cache.put(request, responseToCache);
                                    }
                                })
                                .catch(error => console.warn('Failed to cache response:', error));
                        }
                        return networkResponse;
                    })
                    .catch(() => {
                        // 네트워크 실패 시 캐시에서 가져오기
                        console.log('Network failed, trying cache:', request.url);
                        return caches.match(request)
                            .then(response => {
                                if (response) {
                                    console.log('Serving from cache (fallback):', request.url);
                                    return response;
                                }
                                if (request.destination === 'document') {
                                    return caches.match('/offline.html');
                                }
                                return new Response('', { status: 404 });
                            });
                    })
            );
        } else {
            // 이미지 등 정적 자원은 Cache First
            event.respondWith(
                caches.match(request)
                    .then(response => {
                        if (response) {
                            console.log('Serving from cache:', request.url);
                            return response;
                        }

                        console.log('Fetching from network:', request.url);
                        return fetch(request).then(networkResponse => {
                            if (!networkResponse ||
                                networkResponse.status !== 200 ||
                                networkResponse.type !== 'basic') {
                                return networkResponse;
                            }

                            const responseToCache = networkResponse.clone();
                            caches.open(CACHE_NAME)
                                .then(cache => {
                                    if (request.url.startsWith('http')) {
                                        cache.put(request, responseToCache);
                                    }
                                })
                                .catch(error => {
                                    console.warn('Failed to cache response:', error);
                                });

                            return networkResponse;
                        });
                    })
                    .catch(() => {
                        console.log('Network and cache failed for:', request.url);
                        if (request.destination === 'image') {
                            return new Response('', { status: 404 });
                        }
                        return new Response('', { status: 404 });
                    })
            );
        }
    }
});

// 백그라운드 동기화
self.addEventListener('sync', event => {
    console.log('Background sync triggered:', event.tag);

    if (event.tag === 'sync-test-results') {
        event.waitUntil(syncTestResults());
    } else if (event.tag === 'sync-user-data') {
        event.waitUntil(syncUserData());
    }
});

// 푸시 알림 처리
self.addEventListener('push', event => {
    console.log('Push notification received:', event);

    const options = {
        body: event.data ? event.data.text() : '새로운 알림이 있습니다.',
        icon: '/images/logo.png',
        badge: '/images/badge.png',
        data: {
            timestamp: Date.now()
        }
    };

    event.waitUntil(
        self.registration.showNotification('신입사원 테스트', options)
    );
});

// 테스트 결과 동기화 함수
async function syncTestResults() {
    try {
        console.log('Syncing test results...');

        // IndexedDB나 localStorage에서 대기 중인 결과 가져오기
        const pendingResults = await getPendingResults();

        for (const result of pendingResults) {
            try {
                const response = await fetch('/api/test/submit', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(result)
                });

                if (response.ok) {
                    await removePendingResult(result.id);
                    console.log('Test result synced:', result.id);
                }
            } catch (error) {
                console.error('Failed to sync test result:', error);
            }
        }
    } catch (error) {
        console.error('Background sync failed:', error);
    }
}

// 사용자 데이터 동기화 함수
async function syncUserData() {
    try {
        console.log('Syncing user data...');
        // 사용자 데이터 동기화 로직
    } catch (error) {
        console.error('User data sync failed:', error);
    }
}

// 대기 중인 결과 가져오기
async function getPendingResults() {
    // 실제 구현에서는 IndexedDB 사용
    return [];
}

// 대기 중인 결과 제거
async function removePendingResult(id) {
    // 실제 구현에서는 IndexedDB 사용
    console.log('Removing pending result:', id);
}

// 메시지 처리
self.addEventListener('message', event => {
    console.log('Service Worker message received:', event.data);

    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }

    if (event.data && event.data.type === 'GET_CACHE_STATUS') {
        event.ports[0].postMessage({
            type: 'CACHE_STATUS',
            cached: urlsToCache.length,
            cacheName: CACHE_NAME
        });
    }
}); 