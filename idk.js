// =============================================================================
// CONFIGURATION & METADATA
// =============================================================================

var VERCEL_HOST = "https://idkbro-theta.vercel.app";

function getManifest() {
    return JSON.stringify({
        "id": "nguonc_vercel_proxy",
        "name": "Phim NguonC (Vercel Proxy)",
        "version": "1.1.0",
        "baseUrl": "https://phim.nguonc.com",
        "iconUrl": "https://stpaulclinic.vn/vaapp/plugins/nguonC.png",
        "isEnabled": true,
        "type": "MOVIE",
        "playerType": "embed" 
    });
}

function getHomeSections() {
    return JSON.stringify([
        { slug: 'phim-dang-chieu', title: 'Phim Đang Chiếu', type: 'Horizontal', path: 'danh-sach' },
        { slug: 'phim-le', title: 'Phim Lẻ', type: 'Horizontal', path: 'danh-sach' },
        { slug: 'phim-bo', title: 'Phim Bộ', type: 'Horizontal', path: 'danh-sach' },
        { slug: 'tv-shows', title: 'TV Shows', type: 'Horizontal', path: 'danh-sach' },
        { slug: 'hoat-hinh', title: 'Hoạt Hình', type: 'Horizontal', path: 'the-loai' },
        { slug: 'phim-moi-cap-nhat', title: 'Phim Mới Cập Nhật', type: 'Grid', path: 'phim-moi-cap-nhat' }
    ]);
}

function getPrimaryCategories() {
    return JSON.stringify([
        { name: 'Phim đang chiếu', slug: 'phim-dang-chieu' },
        { name: 'Phim lẻ', slug: 'phim-le' },
        { name: 'Phim bộ', slug: 'phim-bo' },
        { name: 'TV Shows', slug: 'tv-shows' },
        { name: 'Hoạt hình', slug: 'hoat-hinh' }
    ]);
}

function getFilterConfig() {
    return JSON.stringify({
        sort: [
            { name: 'Mới cập nhật', value: 'updated' },
            { name: 'Mới nhất', value: 'new' },
            { name: 'Lượt xem', value: 'view' }
        ]
    });
}

// =============================================================================
// URL GENERATION
// =============================================================================

function getUrlList(slug, filtersJson) {
    try {
        var filters = JSON.parse(filtersJson || "{}");
        var page = filters.page || 1;
        var sort = filters.sort || "updated";

        if (slug === 'phim-moi-cap-nhat') {
            return "https://phim.nguonc.com/api/films/phim-moi-cap-nhat?page=" + page;
        }
        if (filters.category) return "https://phim.nguonc.com/api/films/the-loai/" + filters.category + "?page=" + page;
        if (filters.country) return "https://phim.nguonc.com/api/films/quoc-gia/" + filters.country + "?page=" + page;
        
        var listSlugs = ['phim-le', 'phim-bo', 'phim-dang-chieu', 'tv-shows'];
        if (listSlugs.indexOf(slug) >= 0) {
            return "https://phim.nguonc.com/api/films/danh-sach/" + slug + "?page=" + page;
        }
        return "https://phim.nguonc.com/api/films/the-loai/" + slug + "?page=" + page;
    } catch (e) {
        return "https://phim.nguonc.com/api/films/phim-moi-cap-nhat?page=1";
    }
}

function getUrlSearch(keyword) {
    return "https://phim.nguonc.com/api/films/search?keyword=" + encodeURIComponent(keyword);
}

function getUrlDetail(slug) {
    return "https://phim.nguonc.com/api/film/" + slug;
}

// =============================================================================
// PARSERS
// =============================================================================

function parseListResponse(apiResponseJson) {
    try {
        var response = JSON.parse(apiResponseJson);
        var items = response.items || (response.data && response.data.items) || [];
        var paginate = response.paginate || (response.data && response.data.params && response.data.params.pagination) || {};

        var movies = items.map(function (item) {
            return {
                id: item.slug,
                title: item.name,
                posterUrl: getImageUrl(item.thumb_url),
                backdropUrl: getImageUrl(item.poster_url),
                year: item.year || 0,
                quality: item.quality || "",
                episode_current: item.current_episode || ""
            };
        });

        return JSON.stringify({
            items: movies,
            pagination: {
                currentPage: paginate.current_page || 1,
                totalPages: paginate.total_page || 1
            }
        });
    } catch (e) { return JSON.stringify({ items: [], pagination: {} }); }
}

function parseMovieDetail(apiResponseJson) {
    try {
        var response = JSON.parse(apiResponseJson);
        var movie = response.movie || {};
        var rawEpisodes = movie.episodes || [];

        var servers = [];
        if (Array.isArray(rawEpisodes)) {
            rawEpisodes.forEach(function (server, sIdx) {
                var episodes = [];
                var items = server.items || [];
                items.forEach(function (ep) {
                    var linkEmbed = ep.embed || ep.m3u8 || "";
                    // CHÍNH: Tạo link Proxy trỏ về Vercel của bạn
                    var proxiedUrl = VERCEL_HOST + "/playlist.m3u8?embed=" + encodeURIComponent(linkEmbed);
                    
                    if (linkEmbed) {
                        episodes.push({
                            id: proxiedUrl,
                            name: ep.name || "Tập",
                            slug: ep.slug || ""
                        });
                    }
                });
                if (episodes.length > 0) {
                    servers.push({ name: server.server_name || "Server " + (sIdx+1), episodes: episodes });
                }
            });
        }

        return JSON.stringify({
            id: movie.slug,
            title: movie.name,
            posterUrl: getImageUrl(movie.thumb_url),
            description: (movie.description || "").replace(/<[^>]*>/g, ""),
            year: movie.year,
            servers: servers
        });
    } catch (e) { return "{}"; }
}

function parseDetailResponse(proxiedUrl) {
    // Trả về URL m3u8 đã qua proxy Vercel kèm Header giả lập Android
    return JSON.stringify({
        url: proxiedUrl,
        headers: {
            "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
            "Referer": "https://phim.nguonc.com/"
        }
    });
}

function getImageUrl(path) {
    if (!path) return "";
    return path.indexOf("http") === 0 ? path : "https://img.phimapi.com/" + path;
}

// Các hàm bổ trợ khác
function parseSearchResponse(j) { return parseListResponse(j); }
function parseCategoriesResponse() { return JSON.stringify([{name:"Hành Động",slug:"hanh-dong"},{name:"Cổ Trang",slug:"co-trang"},{name:"Hoạt Hình",slug:"hoat-hinh"}]); }
function parseCountriesResponse() { return JSON.stringify([{name:"Trung Quốc",value:"trung-quoc"},{name:"Hàn Quốc",value:"han-quoc"}]); }
