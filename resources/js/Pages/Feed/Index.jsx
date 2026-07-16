import VideoCard from '@/Components/Feed/VideoCard';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import AppLayout from '@/Layouts/AppLayout';
import { Head, usePage } from '@inertiajs/react';
import axios from 'axios';
import { useCallback, useEffect, useRef, useState } from 'react';
import { RiFilmLine, RiUserAddLine, RiVideoLine } from 'react-icons/ri';

export default function FeedIndex({ initialVideos }) {
    const { auth } = usePage().props;
    const [activeIndex, setActiveIndex] = useState(0);
    const [feedType, setFeedType] = useState('for_you');
    const containerRef = useRef(null);
    const itemRefs = useRef([]);
    // Track if this is the initial mount to avoid double-loading initialVideos
    const isFirstMount = useRef(true);

    const { items: videos, loading, hasMore, loadMore, setItems, reset } = useInfiniteScroll(initialVideos, '/api/feed');

    // Switch feed type — reset everything and load fresh
    // Skip on first mount since initialVideos are already loaded
    useEffect(() => {
        if (isFirstMount.current) {
            isFirstMount.current = false;
            return;
        }
        // Reset state synchronously then load
        reset();
        // Use setTimeout to ensure state update is flushed before loadMore
        const timer = setTimeout(() => {
            loadMore({ type: feedType });
        }, 50);
        return () => clearTimeout(timer);
    }, [feedType]);

    // IntersectionObserver — track active video
    useEffect(() => {
        const observers = [];
        itemRefs.current.forEach((el, i) => {
            if (!el) return;
            const obs = new IntersectionObserver(
    ([entry]) => {
        if (entry.isIntersecting) {
            setActiveIndex(i);
        }
    },
    { threshold: 0.5, rootMargin: '0px' },
);
            obs.observe(el);
            observers.push(obs);
        });
        return () => observers.forEach((o) => o.disconnect());
    }, [videos.length]);

    // Load more when near end
    useEffect(() => {
        if (activeIndex >= videos.length - 3 && hasMore && !loading) {
            loadMore({ type: feedType });
        }
    }, [activeIndex, videos.length, hasMore, loading]);

    // Keyboard navigation
    useEffect(() => {
        const onKey = (e) => {
            if (e.key === 'ArrowDown' || e.key === 'j') scrollToIndex(activeIndex + 1);
            if (e.key === 'ArrowUp' || e.key === 'k') scrollToIndex(activeIndex - 1);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [activeIndex]);

    const scrollToIndex = useCallback(
        (i) => {
            const clamped = Math.max(0, Math.min(i, videos.length - 1));
            itemRefs.current[clamped]?.scrollIntoView({ behavior: 'smooth' });
        },
        [videos.length],
    );

    return (
        <>
            <Head title="For You" />

            {/* For You / Following tabs */}
            <div
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    zIndex: 30,
                    display: 'flex',
                    justifyContent: 'center',
                    paddingTop: 14,
                    pointerEvents: 'none',
                }}
            >
                <div
                    style={{
                        pointerEvents: 'auto',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        background: 'rgba(0,0,0,0.45)',
                        backdropFilter: 'blur(12px)',
                        borderRadius: 999,
                        padding: '4px 6px',
                        border: '1px solid rgba(255,255,255,0.08)',
                    }}
                >
                    {['for_you', 'following'].map((type) => (
                        <button
                            key={type}
                            onClick={() => setFeedType(type)}
                            style={{
                                padding: '4px 18px',
                                borderRadius: 999,
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: 12,
                                fontWeight: 700,
                                transition: 'all 0.2s',
                                background: feedType === type ? '#fff' : 'transparent',
                                color: feedType === type ? '#000' : 'rgba(255,255,255,0.6)',
                            }}
                        >
                            {type === 'for_you' ? 'For You' : 'Following'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Feed scroll container */}
            <div
                ref={containerRef}
                style={{
                    width: '100%',
                    height: '100%',
                    overflowY: 'scroll',
                    scrollSnapType: 'y mandatory',
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                    background: '#000',
                    minHeight: 0,
                }}
            >
                <style>{`
          .feed-scroll::-webkit-scrollbar { display: none; }
          .feed-item-wrap {
  width: 100%;
  height: 100%;
  scroll-snap-align: start;
  scroll-snap-stop: always;
  position: relative;
  overflow: hidden;
  display: flex;
  justify-content: center;
  align-items: stretch;
  background: #000;
}

.feed-item-inner {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
}
          @media (min-width: 768px) {
            .feed-item-inner {
              width: auto !important;
              max-width: 420px !important;
              aspect-ratio: 9/16;
            }
          }
        `}</style>

                {videos.map((video, i) => (
                    <div key={`${video.id}-${i}`} ref={(el) => (itemRefs.current[i] = el)} className="feed-item-wrap">
                        <div className="feed-item-inner">
                            <VideoCard video={video} isActive={activeIndex === i} />
                        </div>
                    </div>
                ))}

                {/* Loading */}
                {loading && (
                    <div className="feed-item-wrap" style={{ alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
                        <div
                            style={{
                                width: 40,
                                height: 40,
                                border: '2px solid rgba(255,255,255,0.15)',
                                borderTopColor: '#FF6B35',
                                borderRadius: '50%',
                                animation: 'spin 0.8s linear infinite',
                            }}
                        />
                        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 8 }}>Loading videos…</p>
                    </div>
                )}

                {/* Following empty */}
                {!loading && feedType === 'following' && videos.length === 0 && (
                    <div className="feed-item-wrap" style={{ alignItems: 'center', justifyContent: 'center' }}>
                        <div
                            style={{
                                textAlign: 'center',
                                padding: '0 40px',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: 16,
                            }}
                        >
                            <div
                                style={{
                                    width: 80,
                                    height: 80,
                                    borderRadius: '50%',
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <RiUserAddLine size={36} color="rgba(255,255,255,0.4)" />
                            </div>
                            <p style={{ color: '#fff', fontWeight: 700, fontSize: 20, margin: 0 }}>Follow some sellers</p>
                            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, margin: 0, lineHeight: 1.5 }}>
                                Videos from sellers you follow will appear here.
                            </p>
                            <a
                                href="/explore"
                                style={{
                                    padding: '12px 28px',
                                    background: '#FF6B35',
                                    borderRadius: 999,
                                    color: '#fff',
                                    fontWeight: 700,
                                    fontSize: 14,
                                    textDecoration: 'none',
                                }}
                            >
                                Discover Sellers
                            </a>
                        </div>
                    </div>
                )}

                {/* End of feed */}
                {!hasMore && !loading && videos.length > 0 && (
                    <div className="feed-item-wrap" style={{ alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                            <RiFilmLine size={48} color="rgba(255,255,255,0.3)" />
                            <p style={{ color: '#fff', fontWeight: 700, fontSize: 18, margin: 0 }}>You're all caught up!</p>
                            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, margin: 0 }}>You've seen all available videos.</p>
                            <button
                                onClick={async () => {
                                    await axios.post('/api/feed/reset', {}, { withCredentials: true });
                                    window.location.reload();
                                }}
                                style={{
                                    marginTop: 8,
                                    padding: '10px 24px',
                                    background: 'rgba(255,255,255,0.08)',
                                    border: '1px solid rgba(255,255,255,0.15)',
                                    borderRadius: 999,
                                    color: '#fff',
                                    fontSize: 13,
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                }}
                            >
                                Watch again
                            </button>
                        </div>
                    </div>
                )}

                {/* For You empty */}
                {!loading && feedType === 'for_you' && videos.length === 0 && (
                    <div className="feed-item-wrap" style={{ alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                            <RiVideoLine size={56} color="rgba(255,255,255,0.2)" />
                            <p style={{ color: '#fff', fontWeight: 700, fontSize: 20, margin: 0 }}>Welcome to Flockr</p>
                            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, margin: 0 }}>
                                Discover products through videos from Nigerian sellers.
                            </p>
                            {!auth?.user && (
                                <a
                                    href="/register"
                                    style={{
                                        padding: '12px 28px',
                                        background: '#FF6B35',
                                        borderRadius: 999,
                                        color: '#fff',
                                        fontWeight: 700,
                                        fontSize: 14,
                                        textDecoration: 'none',
                                    }}
                                >
                                    Get Started
                                </a>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </>
    );
}

FeedIndex.layout = (page) => <AppLayout>{page}</AppLayout>;
