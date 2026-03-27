var VERCEL_DOMAIN = "https://idkbro-theta.vercel.app";

function getUrlDetail(slug) {
    // Trả về URL để Plugin thực hiện GET request
    return VERCEL_DOMAIN + "/phim/" + slug;
}

function parseMovieDetail(apiResponseJson) {
    try {
        // apiResponseJson là nội dung nhận được sau khi GET getUrlDetail
        var data = (typeof apiResponseJson === 'string') ? JSON.parse(apiResponseJson) : apiResponseJson;
        var movie = data.movie || {};
        var rawEpisodes = movie.episodes || [];

        var servers = [];
        rawEpisodes.forEach(function (server, sIdx) {
            var episodes = [];
            (server.items || []).forEach(function (ep) {
                // Link m3u8 đi qua proxy Vercel của bạn
                // Lưu ý: Kiểm tra xem field là ep.m3u8 hay ep.link_m3u8
                var targetLink = ep.m3u8 || ep.embed || ep.link_m3u8;
                var playUrl = VERCEL_DOMAIN + "/playlist.m3u8?embed=" + encodeURIComponent(targetLink);
                
                episodes.push({
                    id: playUrl, // Để playUrl vào ID để hàm sau lấy luôn
                    name: ep.name || "Tập " + (ep.slug || ""),
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

        return {
            id: movie.slug,
            title: movie.name,
            posterUrl: movie.thumb_url,
            backdropUrl: movie.poster_url,
            description: (movie.content || "").replace(/<[^>]*>/g, ""),
            year: movie.year || 0,
            servers: servers
        };
    } catch (e) {
        return {};
    }
}

/**
 * Hàm này thường dùng để lấy link play cuối cùng từ 1 episode id
 */
function parsePlayUrl(episodeId) {
    return {
        url: episodeId, // Vì episodeId ở trên ta đã gán là link Vercel rồi
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Referer": "https://phim.nguonc.com/" 
        }
    };
}
