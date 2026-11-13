import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, money } from '../api.js';
import { GameCover, Loading } from '../components/ui.jsx';

/** Developer or publisher page: company details + its games. */
export default function Company({ kind }) {
  const { id } = useParams();
  const [c, setC] = useState(null);
  useEffect(() => { setC(null); api.get(`/${kind}/${id}`).then(setC); }, [kind, id]);
  if (!c) return <Loading />;
  return (
    <div className="narrow">
      <div className="muted small">{kind === 'developers' ? 'DEVELOPER' : 'PUBLISHER'}</div>
      <h1 className="page-title">{c.name}</h1>
      <p className="muted">
        {[c.country, c.founded_year && `Founded ${c.founded_year}`].filter(Boolean).join(' · ')}
        {c.website && <> · <a href={c.website} target="_blank" rel="noreferrer">{c.website.replace(/^https?:\/\//, '')}</a></>}
      </p>
      <h2 className="section-title">{c.games.length} game{c.games.length === 1 ? '' : 's'}</h2>
      <div className="specials">
        {c.games.map((g) => (
          <Link key={g.game_id} to={`/game/${g.game_id}`} className="special-card">
            <GameCover title={g.title} color={g.cover_color} size="md" />
            <div className="special-foot"><span className="small">{g.title}</span><span>{money(g.final_price)}</span></div>
          </Link>
        ))}
      </div>
    </div>
  );
}
