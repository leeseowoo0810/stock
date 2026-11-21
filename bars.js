// Vercel Serverless Function: /api/bars?tf=d|w|m&symbols=AAPL,MSFT,...
// 일봉(d): 2년 / 주봉(w): 10년 / 월봉(m): 전체 기간 — Yahoo Finance(비공식 API) 기반
// 다른 데이터 제공처(Polygon, Finnhub, Twelve Data 등)로 바꾸려면 이 파일의 fetch 부분만 교체하세요.
const MAP = { d: ["1d", "2y"], w: ["1wk", "10y"], m: ["1mo", "max"] };

module.exports = async (req, res) => {
  const tf = MAP[req.query.tf] ? req.query.tf : "d";
  const [interval, range] = MAP[tf];
  const syms = String(req.query.symbols || "")
    .split(",")
    .filter((s) => /^[A-Z.\-]{1,6}$/.test(s))
    .slice(0, 25);
  const out = {};

  await Promise.all(
    syms.map(async (s) => {
      try {
        const y = s.replace(".", "-"); // BRK.B -> BRK-B
        const r = await fetch(
          `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(y)}?interval=${interval}&range=${range}`,
          { headers: { "User-Agent": "Mozilla/5.0" } }
        );
        const j = await r.json();
        const x = j.chart.result[0];
        const q = x.indicators.quote[0];
        const d = [], c = [], v = [];
        x.timestamp.forEach((t, i) => {
          if (q.close[i] != null) {
            d.push(new Date(t * 1000).toISOString().slice(0, 10));
            c.push(q.close[i]);
            v.push(q.volume[i] || 0);
          }
        });
        out[s] = { d, c, v };
      } catch (e) {
        /* 실패한 종목은 응답에서 제외 */
      }
    })
  );

  res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
  res.status(200).json(out);
};
