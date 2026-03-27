// =============================================================================
// NGUONC PLUGIN - VERCEL PROXY VERSION
// =============================================================================

var VERCEL_DOMAIN = "https://idkbro-theta.vercel.app";

/**
 * Hàm lấy URL chi tiết phim: 
 * Thay vì gọi thẳng NguonC, ta gọi qua Vercel để lấy JSON sạch
 */
function getUrlDetail(slug) {
    return VERCEL_DOMAIN + "/phim/" + slug;
}

/**
 * Hàm phân tích chi tiết phim từ JSON mà Vercel trả về
 */
function parseMovieDetail(apiResponseJson) {
    try {
        var data = JSON.parse(apiResponseJson);
        var movie = data.movie || {};
        var rawEpisodes = movie.episodes || [];

        var servers = [];
        rawEpisodes.forEach(function (server, sIdx) {
            var episodes = [];
            (server.items || []).forEach(function (ep) {
                // TẠO LINK XEM: Trỏ thẳng về API playlist trên Vercel của bạn
                // Logic này khớp với route /xem/<slug>/<int:server_idx>/<ep_slug>
                var playUrl = VERCEL_DOMAIN + "/playlist.m3u8?embed=" + encodeURIComponent(ep.embed || ep.m3u8);
                
                episodes.push({
                    id: playUrl,
                    name: ep.name || "Tập " + ep.slug,
                    slug: ep.slug
                });
            });

            if (episodes.length > 0) {
                servers.push({
                    name: server.server_name || "Server " + (sIdx + 1),
                    episodes: episodes
                });
            }
        });

        return JSON.stringify({
            id: movie.slug,
            title: movie.name,
            posterUrl: movie.thumb_url,
            backdropUrl: movie.poster_url,
            description: (movie.content || "").replace(/<[^>]*>/g, ""),
            year: movie.year || 0,
            servers: servers
        });
    } catch (e) {
        return "{}";
    }
}

/**
 * Hàm lấy link m3u8 cuối cùng
 * Vì 'id' ở trên đã là link playlist.m3u8 của Vercel, 
 * nên hàm này chỉ cần trả về đúng link đó.
 */
function parseDetailResponse(html) {
    // Trong trường hợp này, 'html' thực chất là link m3u8 đã tạo ở parseMovieDetail
    return JSON.stringify({
        url: html, // Link proxy từ Vercel
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Referer": "https://phim.nguonc.com/"
        }
    });
}
