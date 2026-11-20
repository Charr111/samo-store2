import React, { useEffect, useRef, useState } from 'react';
import { Search, ShoppingBag, Menu, X, ChevronRight, Sparkles } from 'lucide-react';
import { CategoryItem, Department, RoutePath } from '../types/samo';

interface NavbarProps {
  currentRoute: RoutePath;
  onNavigate: (route: RoutePath, categorySlug?: string) => void;
  womenCategories: CategoryItem[];
  kidsCategories: CategoryItem[];
  selectedCategory: string;
  onSelectCategory: (catName: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onAiQuickSearch: (q: string) => void;
  cartCount: number;
  onOpenCart: () => void;
  onOpenAiStylist: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentRoute,
  onNavigate,
  womenCategories,
  kidsCategories,
  selectedCategory,
  onSelectCategory,
  searchQuery,
  onSearchChange,
  onAiQuickSearch,
  cartCount,
  onOpenCart,
  onOpenAiStylist,
}) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<Department>('women');
  const [isScrolledPastHero, setIsScrolledPastHero] = useState(false);
  const [isHeaderHovered, setIsHeaderHovered] = useState(false);
  const [bagPulse, setBagPulse] = useState(false);
  const prevCartCountRef = useRef<number>(cartCount);

  useEffect(() => {
    if (cartCount > prevCartCountRef.current) {
      setBagPulse(true);
      const timer = window.setTimeout(() => setBagPulse(false), 1200);
      prevCartCountRef.current = cartCount;
      return () => window.clearTimeout(timer);
    }
    prevCartCountRef.current = cartCount;
  }, [cartCount]);

  useEffect(() => {
    if (currentRoute !== '/home') {
      setIsScrolledPastHero(true);
      setIsHeaderHovered(false);
      return;
    }

    const checkScrollPosition = () => {
      const heroEl = document.getElementById('samo-home-hero-wrapper');
      if (heroEl) {
        const rect = heroEl.getBoundingClientRect();
        // Transition to solid white header as soon as the bottom of the hero video reaches the 64px (h-16) navbar
        setIsScrolledPastHero(rect.bottom <= 64);
      } else {
        const fallbackThreshold = Math.max(200, window.innerHeight * 0.65);
        setIsScrolledPastHero(window.scrollY > fallbackThreshold);
      }
    };

    checkScrollPosition();
    window.addEventListener('scroll', checkScrollPosition, { passive: true });
    window.addEventListener('resize', checkScrollPosition, { passive: true });
    return () => {
      window.removeEventListener('scroll', checkScrollPosition);
      window.removeEventListener('resize', checkScrollPosition);
    };
  }, [currentRoute]);

  const isHomeHeroOverlay = currentRoute === '/home' && !searchQuery.trim();
  const isTransparentOverVideo =
    isHomeHeroOverlay &&
    !isScrolledPastHero &&
    !isHeaderHovered &&
    !drawerOpen;

  const activeDepartmentCategories =
    currentRoute === '/women'
      ? womenCategories
      : currentRoute === '/kids'
      ? kidsCategories
      : [];

  const handleCategoryClick = (dept: Department, catName: string) => {
    const targetRoute: RoutePath = dept === 'women' ? '/women' : '/kids';
    onNavigate(targetRoute);
    onSelectCategory(catName);
    setDrawerOpen(false);
  };

  return (
    <>
      <header
        onPointerEnter={(e) => {
          if (e.pointerType === 'mouse') setIsHeaderHovered(true);
        }}
        onPointerLeave={(e) => {
          if (e.pointerType === 'mouse') setIsHeaderHovered(false);
        }}
        className={`${
          isHomeHeroOverlay ? 'fixed top-0 inset-x-0' : 'sticky top-0'
        } z-40 w-full transition-colors duration-300 ease-out ${
          isTransparentOverVideo
            ? 'bg-transparent border-b border-transparent'
            : 'bg-[#FFFFFF] border-b border-zinc-200'
        }`}
      >
      {/* Primary Top Bar:
          - Mobile (< lg): Left Menu Hamburger | Center SAMO Logo | Right Compact Bag Icon
          - Desktop (lg+): Left Nav Links (New Arrivals, Women, Kids, Gifts) | Center SAMO Logo | Right Bag & Menu
      */}
      <div
        className={`relative grid grid-cols-3 items-center justify-between px-4 md:px-8 h-16 transition-colors duration-300 ease-out ${
          isTransparentOverVideo
            ? 'border-b border-transparent'
            : 'border-b border-zinc-200/80'
        }`}
      >
        {/* Zone 1 (Left):
            - On Mobile (< lg): Menu Hamburger Icon on the left
            - On Desktop (lg+): Navigation Links (New Arrivals, Women, Kids, Gifts)
        */}
        <div className="flex items-center justify-start min-w-0">
          {/* Mobile (< lg) Left Menu Hamburger Button */}
          <button
            type="button"
            onClick={() => {
              if (!drawerOpen) {
                if (
                  currentRoute === '/kids' ||
                  (currentRoute === '/new-arrivals' &&
                    selectedCategory.toLowerCase() === 'kids')
                ) {
                  setDrawerTab('kids');
                } else if (
                  currentRoute === '/women' ||
                  (currentRoute === '/new-arrivals' &&
                    selectedCategory.toLowerCase() !== 'kids')
                ) {
                  setDrawerTab('women');
                }
              }
              setDrawerOpen(!drawerOpen);
            }}
            aria-label={drawerOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className={`lg:hidden p-2 -ml-2 transition-colors duration-300 cursor-pointer ${
              isTransparentOverVideo
                ? 'text-white hover:bg-white/15'
                : 'text-zinc-950 hover:bg-zinc-100'
            }`}
          >
            {drawerOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {/* Desktop (lg+) Left Navigation Links */}
          <nav
            aria-label="Main Storefront Navigation"
            className={`hidden lg:flex items-center gap-6 xl:gap-7 text-xs font-semibold tracking-[0.12em] uppercase transition-colors duration-300 ${
              isTransparentOverVideo ? 'text-white' : 'text-zinc-700'
            }`}
          >
            <a
              href="/new-arrivals/women"
              onClick={(e) => {
                e.preventDefault();
                onNavigate('/new-arrivals', 'women');
              }}
              className={`py-1 transition-colors duration-300 whitespace-nowrap shrink-0 ${
                currentRoute === '/new-arrivals' &&
                selectedCategory.toLowerCase() !== 'kids'
                  ? isTransparentOverVideo
                    ? 'text-white border-b-2 border-white'
                    : 'text-zinc-950 border-b-2 border-zinc-950'
                  : isTransparentOverVideo
                  ? 'text-white/90 hover:text-white'
                  : 'hover:text-zinc-950'
              }`}
            >
              New Arrivals
            </a>
            <a
              href="/women"
              onClick={(e) => {
                e.preventDefault();
                onNavigate('/women');
                onSelectCategory('all');
              }}
              className={`py-1 transition-colors duration-300 whitespace-nowrap shrink-0 ${
                currentRoute === '/women'
                  ? isTransparentOverVideo
                    ? 'text-white border-b-2 border-white'
                    : 'text-zinc-950 border-b-2 border-zinc-950'
                  : isTransparentOverVideo
                  ? 'text-white/90 hover:text-white'
                  : 'hover:text-zinc-950'
              }`}
            >
              Women
            </a>
            <a
              href="/kids"
              onClick={(e) => {
                e.preventDefault();
                onNavigate('/kids');
                onSelectCategory('all');
              }}
              className={`py-1 transition-colors duration-300 whitespace-nowrap shrink-0 ${
                currentRoute === '/kids'
                  ? isTransparentOverVideo
                    ? 'text-white border-b-2 border-white'
                    : 'text-zinc-950 border-b-2 border-zinc-950'
                  : isTransparentOverVideo
                  ? 'text-white/90 hover:text-white'
                  : 'hover:text-zinc-950'
              }`}
            >
              Kids
            </a>
            <a
              href="/gifts"
              onClick={(e) => {
                e.preventDefault();
                onNavigate('/gifts');
                onSelectCategory('all');
              }}
              className={`py-1 transition-colors duration-300 whitespace-nowrap shrink-0 ${
                currentRoute === '/gifts'
                  ? isTransparentOverVideo
                    ? 'text-white border-b-2 border-white'
                    : 'text-zinc-950 border-b-2 border-zinc-950'
                  : isTransparentOverVideo
                  ? 'text-white/90 hover:text-white'
                  : 'hover:text-zinc-950'
              }`}
            >
              Gifts
            </a>
          </nav>
        </div>

        {/* Zone 2 (Middle — Mobile & Desktop): Centered SAMO Logo with Dual-Logo Seamless Crossfade */}
        <div className="flex items-center justify-center">
          <a
            href="/home"
            onClick={(e) => {
              e.preventDefault();
              onNavigate('/home');
              onSelectCategory('all');
            }}
            aria-label="SAMO Home"
            className="relative inline-flex items-center justify-center shrink-0"
          >
            {/* Black SAMO Logo (visible on hover, scroll past video, drawer open, or other pages) */}
            <img
              src="https://images.samoweave.com/logo/samo-weave-logo.png"
              alt="SAMO"
              loading="eager"
              decoding="async"
              className={`h-8 sm:h-9 md:h-10 w-auto max-w-[160px] sm:max-w-[190px] md:max-w-[220px] object-contain select-none transition-opacity duration-300 ease-out ${
                isTransparentOverVideo ? 'opacity-0' : 'opacity-100'
              }`}
            />
            {/* White Transparent SAMO Logo (visible over homepage hero video) */}
            <img
              src="https://images.samoweave.com/logo/white-logo-samo_50.png"
              alt="SAMO"
              loading="eager"
              decoding="async"
              aria-hidden={!isTransparentOverVideo}
              className={`absolute inset-0 m-auto h-8 sm:h-9 md:h-10 w-auto max-w-[160px] sm:max-w-[190px] md:max-w-[220px] object-contain select-none transition-opacity duration-300 ease-out ${
                isTransparentOverVideo ? 'opacity-100' : 'opacity-0'
              }`}
            />
          </a>
        </div>

        {/* Zone 3 (Right):
            - On Mobile (< lg): Compact Bag Icon at the far right end of the screen
            - On Desktop (lg+): Full Bag button + Desktop Menu Drawer button
        */}
        <div className="flex items-center justify-end gap-3 shrink-0">
          {/* Mobile (< lg) Icon-Only Bag Button at the far right */}
          <button
            type="button"
            onClick={onOpenCart}
            aria-label={`Shopping Bag (${cartCount} items)`}
            className={`lg:hidden relative p-2 -mr-1.5 transition-all duration-300 cursor-pointer ${
              isTransparentOverVideo
                ? 'text-white hover:bg-white/15'
                : 'text-zinc-950 hover:bg-zinc-100'
            } ${
              bagPulse
                ? isTransparentOverVideo
                  ? 'scale-110 ring-1 ring-white bg-white/20 rounded-full'
                  : 'scale-110 ring-1 ring-zinc-950 bg-zinc-950/10 rounded-full'
                : ''
            }`}
          >
            <ShoppingBag className={`w-5 h-5 stroke-[1.75] transition-transform duration-300 ${bagPulse ? '-translate-y-0.5' : ''}`} />
            {cartCount > 0 && (
              <span
                className={`absolute top-1 right-1 min-w-[15px] h-[15px] px-1 text-[9px] font-mono-tabular font-bold flex items-center justify-center leading-none transition-all duration-300 ${
                  bagPulse
                    ? isTransparentOverVideo
                      ? 'bg-white text-zinc-950 scale-110 shadow-sm'
                      : 'bg-zinc-950 text-white scale-110 shadow-sm'
                    : isTransparentOverVideo
                    ? 'bg-white text-zinc-950'
                    : 'bg-zinc-950 text-white'
                }`}
              >
                {cartCount}
              </span>
            )}
          </button>

          {/* Desktop (lg+) Bag Button & Drawer Trigger */}
          <button
            type="button"
            onClick={onOpenCart}
            aria-label={`Shopping Bag (${cartCount} items)`}
            className={`hidden lg:flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold tracking-[0.1em] uppercase transition-all duration-300 whitespace-nowrap shrink-0 cursor-pointer ${
              bagPulse
                ? isTransparentOverVideo
                  ? 'bg-white text-zinc-950 border border-white scale-105 shadow-md'
                  : 'bg-zinc-950 text-white border border-zinc-950 ring-2 ring-zinc-950/30 scale-105 shadow-md'
                : isTransparentOverVideo
                ? 'bg-transparent text-white border border-white/80 hover:bg-white hover:text-zinc-950'
                : 'bg-zinc-950 text-white border border-zinc-950 hover:bg-zinc-800'
            }`}
          >
            <ShoppingBag className={`w-3.5 h-3.5 transition-transform duration-300 ${bagPulse ? 'scale-110' : ''}`} />
            <span>Bag ({cartCount})</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (!drawerOpen) {
                if (
                  currentRoute === '/kids' ||
                  (currentRoute === '/new-arrivals' &&
                    selectedCategory.toLowerCase() === 'kids')
                ) {
                  setDrawerTab('kids');
                } else if (
                  currentRoute === '/women' ||
                  (currentRoute === '/new-arrivals' &&
                    selectedCategory.toLowerCase() !== 'kids')
                ) {
                  setDrawerTab('women');
                }
              }
              setDrawerOpen(!drawerOpen);
            }}
            aria-label={drawerOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className={`hidden lg:inline-flex p-2 transition-colors duration-300 cursor-pointer ${
              isTransparentOverVideo
                ? 'text-white hover:bg-white/15'
                : 'text-zinc-950 hover:bg-zinc-100'
            }`}
          >
            {drawerOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Balenciaga-inspired Full-Width Search Strip ("WHAT ARE YOU LOOKING FOR?") — Hidden on Home Screen, shown on Category & Collection Pages */}
      {currentRoute !== '/home' && (
        <div className="flex items-center justify-between px-4 md:px-8 h-10 bg-white border-b border-zinc-200">
          <div className="flex items-center gap-3 flex-1">
            <Search className="w-4 h-4 text-zinc-500 shrink-0" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchQuery.trim()) {
                  onAiQuickSearch(searchQuery.trim());
                }
              }}
              placeholder="WHAT ARE YOU LOOKING FOR? (E.G. COW LEATHER JACKET, SUEDE TRENCH...)"
              aria-label="Search SAMO catalog"
              className="w-full text-[11px] md:text-xs tracking-[0.08em] uppercase placeholder:text-zinc-400 text-zinc-950 focus:outline-none bg-transparent"
            />
          </div>
          {searchQuery && (
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => onAiQuickSearch(searchQuery)}
                className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Sparkles className="w-3 h-3" />
                <span>Smart Match</span>
              </button>
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="text-[11px] uppercase tracking-wider text-zinc-500 hover:text-zinc-950 px-1.5 cursor-pointer"
              >
                Clear
              </button>
            </div>
          )}
        </div>
      )}

      {/* Subcategory Horizontal Ribbon ONLY for /women and /kids (matching Video 2 & Screenshot 4) */}
      {(currentRoute === '/women' || currentRoute === '/kids') && (
        <div className="flex items-center px-4 md:px-8 h-12 bg-white border-b border-zinc-200">
          <span className="hidden lg:inline-block text-sm font-bold text-zinc-950 pr-8 shrink-0">
            {currentRoute === '/women' ? 'Women' : 'Kids'}
          </span>
          <div
            role="tablist"
            aria-label={`${
              currentRoute === '/women' ? 'Women' : 'Kids'
            } Subcategories`}
            className="flex items-center lg:justify-center gap-6 flex-1 h-full overflow-x-auto no-scrollbar"
          >
            <button
              type="button"
              role="tab"
              aria-selected={selectedCategory === 'all'}
              onClick={() => onSelectCategory('all')}
              className={`h-full inline-flex items-center text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer border-b-2 ${
                selectedCategory === 'all'
                  ? 'text-zinc-950 border-zinc-950'
                  : 'text-zinc-500 border-transparent hover:text-zinc-950'
              }`}
            >
              View all
            </button>
            {activeDepartmentCategories.map((cat) => {
              const isSelected =
                selectedCategory.toLowerCase() === cat.name.toLowerCase();
              return (
                <button
                  key={cat.id}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => onSelectCategory(cat.name)}
                  className={`h-full inline-flex items-center text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer border-b-2 ${
                    isSelected
                      ? 'text-zinc-950 border-zinc-950'
                      : 'text-zinc-500 border-transparent hover:text-zinc-950'
                  }`}
                >
                  {cat.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      </header>

      {/* Slide-out Mega Drawer */}
      {drawerOpen && (
        <div className="fixed inset-x-0 top-16 bottom-0 z-50 flex bg-black/50 h-[calc(100dvh-4rem)]">
          <div className="w-full max-w-md bg-[#FFFFFF] text-zinc-950 h-full overflow-y-auto border-r border-zinc-200 flex flex-col justify-between p-6">
            <div>
              {/* Department Switcher Tabs */}
              <div className="grid grid-cols-2 border border-zinc-950 mb-6">
                <button
                  type="button"
                  onClick={() => setDrawerTab('women')}
                  className={`py-2.5 text-xs font-bold tracking-[0.14em] uppercase cursor-pointer ${
                    drawerTab === 'women'
                      ? 'bg-zinc-950 text-white'
                      : 'bg-white text-zinc-950 hover:bg-zinc-100'
                  }`}
                >
                  Women ({womenCategories.length})
                </button>
                <button
                  type="button"
                  onClick={() => setDrawerTab('kids')}
                  className={`py-2.5 text-xs font-bold tracking-[0.14em] uppercase cursor-pointer ${
                    drawerTab === 'kids'
                      ? 'bg-zinc-950 text-white'
                      : 'bg-white text-zinc-950 hover:bg-zinc-100'
                  }`}
                >
                  Kids ({kidsCategories.length})
                </button>
              </div>

              {/* Quick House Links */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => {
                    onNavigate(
                      '/new-arrivals',
                      drawerTab === 'kids' ? 'kids' : 'women'
                    );
                    setDrawerOpen(false);
                  }}
                  className="py-2 px-2 border border-zinc-300 text-[11px] font-bold uppercase tracking-wider hover:border-zinc-950 cursor-pointer"
                >
                  New Arrivals
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onNavigate('/gifts');
                    setDrawerOpen(false);
                  }}
                  className="py-2 px-2 border border-zinc-300 text-[11px] font-bold uppercase tracking-wider hover:border-zinc-950 cursor-pointer"
                >
                  Gifts
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onNavigate('/showroom');
                    setDrawerOpen(false);
                  }}
                  className="py-2 px-2 border border-zinc-300 text-[11px] font-bold uppercase tracking-wider hover:border-zinc-950 cursor-pointer"
                >
                  Showroom
                </button>
              </div>

              {/* View Full Department */}
              <button
                type="button"
                onClick={() => {
                  onNavigate(drawerTab === 'women' ? '/women' : '/kids');
                  onSelectCategory('all');
                  setDrawerOpen(false);
                }}
                className="w-full flex items-center justify-between py-3 border-b border-zinc-200 text-xs font-bold tracking-[0.14em] uppercase text-zinc-950 hover:pl-1 transition-all cursor-pointer"
              >
                <span>View All {drawerTab === 'women' ? 'Women' : 'Kids'}</span>
                <ChevronRight className="w-4 h-4" />
              </button>

              {/* Category List */}
              <div className="divide-y divide-zinc-100">
                {(drawerTab === 'women' ? womenCategories : kidsCategories).map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleCategoryClick(drawerTab, cat.name)}
                    className="w-full flex items-center justify-between py-3.5 text-left text-xs font-semibold tracking-[0.12em] uppercase text-zinc-800 hover:text-zinc-950 hover:bg-zinc-50 px-1 transition-colors cursor-pointer"
                  >
                    <span>{cat.name}</span>
                    <ChevronRight className="w-4 h-4 text-zinc-400" />
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-6 border-t border-zinc-200 space-y-3 text-xs tracking-wider uppercase text-zinc-600">
              <div className="flex items-center justify-between pt-2 text-[11px] text-zinc-500">
                <span>International Version</span>
                <span>Language: English</span>
              </div>
            </div>
          </div>

          {/* Click outside backdrop to close */}
          <div
            className="flex-1 h-full"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
        </div>
      )}
    </>
  );
};
