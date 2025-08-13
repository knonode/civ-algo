import React, { useEffect, useMemo, useState } from 'react';
import './AdminPanel.css';

type AssetRow = {
  name: string;
  type: string;
  mpr: number;
  trend: 'up' | 'down';
  ppl: number;
  diff: number;
};

type SetRow = {
  name: string;
  type: string; // .svg filename format
  subType: string;
  country: string;
  period: string;
};

type PplRow = {
  date: string; // ISO or display
  amount: number;
};

type Props = {
  assets?: AssetRow[];
  sets?: SetRow[];
  ppl?: PplRow[];
};

type SortState<T> = { key: keyof T; dir: 'asc' | 'desc' } | null;

function useSortableData<T extends Record<string, unknown>>(rows: T[], initial: SortState<T> = null) {
  const [sort, setSort] = useState<SortState<T>>(initial);
  const sorted = useMemo(() => {
    if (!sort) return rows;
    const { key, dir } = sort;
    const copy = [...rows];
    copy.sort((a, b) => {
      const av = a[key] as unknown;
      const bv = b[key] as unknown;
      if (typeof av === 'number' && typeof bv === 'number') {
        return dir === 'asc' ? av - bv : bv - av;
      }
      const as = String(av ?? '');
      const bs = String(bv ?? '');
      return dir === 'asc' ? as.localeCompare(bs) : bs.localeCompare(as);
    });
    return copy;
  }, [rows, sort]);
  const requestSort = (key: keyof T) => {
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, dir: 'asc' };
      return { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' };
    });
  };
  return { sorted, sort, requestSort };
}

// No placeholder data; these tables will be populated from real sources later

const periodsFallback = [
  'Lower Paleolithic',
  'Middle Paleolithic',
  'Upper Paleolithic',
  'Neolithic',
  'Bronze Age',
  'Iron Age',
  'Classical',
  'Medieval',
  'Early Modern',
  'Industrial',
  'Contemporary',
];

const AdminPanel: React.FC<Props> = ({ assets, sets, ppl }) => {
  const [activeTab, setActiveTab] = useState<'ASSETS' | 'SETS' | 'PPL' | 'CRAFT'>('ASSETS');

  const assetsData = assets ?? [];
  const setsData = sets ?? [];
  const pplData = ppl ?? [];

  const { sorted: sortedAssets, sort: assetSort, requestSort: sortAssets } = useSortableData<AssetRow>(assetsData);
  const { sorted: sortedSets, sort: setSort, requestSort: sortSets } = useSortableData<SetRow>(setsData);
  const { sorted: sortedPpl, sort: pplSort, requestSort: sortPpl } = useSortableData<PplRow>(pplData, { key: 'date', dir: 'desc' });

  const pplTotals = useMemo(() => {
    const balance = sortedPpl.reduce((acc, r) => acc + r.amount, 0);
    const surplus = sortedPpl.filter(r => r.amount > 0).reduce((acc, r) => acc + r.amount, 0);
    const deficit = Math.abs(sortedPpl.filter(r => r.amount < 0).reduce((acc, r) => acc + r.amount, 0));
    const trend = sortedPpl.length >= 2
      ? (sortedPpl[0].amount - sortedPpl[1].amount >= 0 ? 'up' : 'down')
      : null;
    return { balance, surplus, deficit, trend } as { balance: number; surplus: number; deficit: number; trend: 'up' | 'down' | null };
  }, [sortedPpl]);

  const [countries, setCountries] = useState<string[]>([]);
  useEffect(() => {
    let aborted = false;
    fetch('/world.geo.json')
      .then(r => r.ok ? r.json() : Promise.reject(new Error(String(r.status))))
      .then((geo: { features?: Array<{ properties?: { name?: string } }> }) => {
        if (aborted) return;
        const names = Array.from(new Set<string>(((geo.features || []).map((f) => f?.properties?.name).filter((n): n is string => typeof n === 'string')))).sort();
        setCountries(names);
      })
      .catch(() => setCountries([]));
    return () => { aborted = true; };
  }, []);

  const [craftName, setCraftName] = useState('');
  type CraftType = 'stlm' | 'city' | 'empr' | 'contr' | 'spcl';
  const [craftType, setCraftType] = useState<CraftType>('stlm');
  const [craftSubtype, setCraftSubtype] = useState('');
  const [craftLat, setCraftLat] = useState('');
  const [craftLon, setCraftLon] = useState('');
  const [craftCountry, setCraftCountry] = useState('');
  const [timeStart, setTimeStart] = useState('');
  const [timeEnd, setTimeEnd] = useState('');
  const [craftPeriod, setCraftPeriod] = useState('');
  const [craftMpr, setCraftMpr] = useState<number | ''>('');

  const getUtf8BytesLength = (s: string) => new TextEncoder().encode(s).length;
  const isNameTooLong = getUtf8BytesLength(craftName) > 32;

  const periods = periodsFallback;

  return (
    <div className="admin-panel">
      <div className="admin-tabs">
        {(['ASSETS','SETS','PPL','CRAFT'] as const).map((tab) => (
          <button
            key={tab}
            className={`admin-tab${activeTab === tab ? ' active' : ''}`}
            onClick={() => setActiveTab(tab)}
            type="button"
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'ASSETS' && (
        <div className="admin-section">
          <table className="admin-table">
            <thead>
              <tr>
                <th onClick={() => sortAssets('name')}>Name{assetSort?.key === 'name' ? (assetSort.dir === 'asc' ? ' ▲' : ' ▼') : ''}</th>
                <th onClick={() => sortAssets('type')}>Type{assetSort?.key === 'type' ? (assetSort.dir === 'asc' ? ' ▲' : ' ▼') : ''}</th>
                <th onClick={() => sortAssets('mpr')}>MPR{assetSort?.key === 'mpr' ? (assetSort.dir === 'asc' ? ' ▲' : ' ▼') : ''}</th>
                <th>Trend</th>
                <th onClick={() => sortAssets('ppl')}>PPL{assetSort?.key === 'ppl' ? (assetSort.dir === 'asc' ? ' ▲' : ' ▼') : ''}</th>
                <th onClick={() => sortAssets('diff')}>Diff{assetSort?.key === 'diff' ? (assetSort.dir === 'asc' ? ' ▲' : ' ▼') : ''}</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {sortedAssets.map((r, i) => (
                <tr key={i}>
                  <td>{r.name}</td>
                  <td>{r.type}</td>
                  <td className="num">{r.mpr}</td>
                  <td className={`trend ${r.trend}`}>{r.trend === 'up' ? '▲' : '▼'}</td>
                  <td className="num">{r.ppl}</td>
                  <td className={`num ${r.diff >= 0 ? 'pos' : 'neg'}`}>{r.diff}</td>
                  <td>
                    <button className="action-pill" type="button" aria-label="action">
                      <span className="dot" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'SETS' && (
        <div className="admin-section">
          <table className="admin-table">
            <thead>
              <tr>
                <th onClick={() => sortSets('name')}>Name{setSort?.key === 'name' ? (setSort.dir === 'asc' ? ' ▲' : ' ▼') : ''}</th>
                <th onClick={() => sortSets('type')}>Type{setSort?.key === 'type' ? (setSort.dir === 'asc' ? ' ▲' : ' ▼') : ''}</th>
                <th onClick={() => sortSets('subType')}>Sub-type{setSort?.key === 'subType' ? (setSort.dir === 'asc' ? ' ▲' : ' ▼') : ''}</th>
                <th onClick={() => sortSets('country')}>Country{setSort?.key === 'country' ? (setSort.dir === 'asc' ? ' ▲' : ' ▼') : ''}</th>
                <th onClick={() => sortSets('period')}>Period{setSort?.key === 'period' ? (setSort.dir === 'asc' ? ' ▲' : ' ▼') : ''}</th>
                <th className="nosort">Collect</th>
              </tr>
            </thead>
            <tbody>
              {sortedSets.map((r, i) => (
                <tr key={i}>
                  <td>{r.name}</td>
                  <td>{r.type}</td>
                  <td>{r.subType}</td>
                  <td>{r.country}</td>
                  <td>{r.period}</td>
                  <td>
                    <button className="action-pill" type="button" aria-label="collect">
                      <span className="dot" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'PPL' && (
        <div className="admin-section">
          <table className="admin-table">
            <thead>
              <tr>
                <th onClick={() => sortPpl('date')}>Date{pplSort?.key === 'date' ? (pplSort.dir === 'asc' ? ' ▲' : ' ▼') : ''}</th>
                <th onClick={() => sortPpl('amount')}>Amount{pplSort?.key === 'amount' ? (pplSort.dir === 'asc' ? ' ▲' : ' ▼') : ''}</th>
              </tr>
            </thead>
            <tbody>
              {sortedPpl.map((r, i) => (
                <tr key={i}>
                  <td>{new Date(r.date).toLocaleString()}</td>
                  <td className={`num ${r.amount >= 0 ? 'pos' : 'neg'}`}>{r.amount}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="ppl-summary">
                <td colSpan={2}>
                  <div className="summary-grid">
                    <div><strong>Balance (total)</strong>: <span className="num">{pplTotals.balance}</span></div>
                    <div><strong>Surplus</strong>: <span className="num pos">{pplTotals.surplus}</span></div>
                    <div><strong>Deficit</strong>: <span className="num neg">{pplTotals.deficit}</span></div>
                    <div><strong>Trend</strong>: {pplTotals.trend ? (<span className={`trend ${pplTotals.trend}`}>{pplTotals.trend === 'up' ? '▲' : '▼'}</span>) : (<span>—</span>)}</div>
                    <div className="summary-action">
                      <button type="button" className="market-pill">PPL Market</button>
                    </div>
                  </div>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {activeTab === 'CRAFT' && (
        <div className="admin-section">
          <form className="craft-form" onSubmit={(e) => { e.preventDefault(); }}>
            <div className="form-grid">
              <label>
                <span>Name</span>
                <input
                  type="text"
                  value={craftName}
                  onChange={(e) => setCraftName(e.target.value)}
                  aria-invalid={isNameTooLong}
                />
                <div className={`hint${isNameTooLong ? ' error' : ''}`}>{getUtf8BytesLength(craftName)}/32 bytes</div>
              </label>

              <label>
                <span>Type</span>
                <select value={craftType} onChange={(e) => setCraftType(e.target.value as CraftType)}>
                  <option value="stlm">stlm</option>
                  <option value="city">city</option>
                  <option value="empr">empr</option>
                  <option value="contr">contr</option>
                  <option value="spcl">spcl</option>
                </select>
              </label>

              <label>
                <span>Subtype</span>
                <select value={craftSubtype} onChange={(e) => setCraftSubtype(e.target.value)}>
                  <option value="">—</option>
                  <option value="WHS">WHS</option>
                  <option value="UNESCO">UNESCO</option>
                </select>
              </label>

              <label className="coords">
                <span>Location</span>
                <div className="coords-inputs">
                  <input type="number" placeholder="lat" value={craftLat} onChange={(e) => setCraftLat(e.target.value)} />
                  <input type="number" placeholder="lon" value={craftLon} onChange={(e) => setCraftLon(e.target.value)} />
                </div>
              </label>

              <label>
                <span>Country</span>
                <input list="countries" value={craftCountry} onChange={(e) => setCraftCountry(e.target.value)} />
                <datalist id="countries">
                  {countries.map((c) => (<option key={c} value={c} />))}
                </datalist>
              </label>

              <label className="time-range">
                <span>Time</span>
                <div className="time-inputs">
                  <input type="number" placeholder="start (year)" value={timeStart} onChange={(e) => setTimeStart(e.target.value)} />
                  <input type="number" placeholder="end (year)" value={timeEnd} onChange={(e) => setTimeEnd(e.target.value)} />
                </div>
              </label>

              <label>
                <span>Period</span>
                <select value={craftPeriod} onChange={(e) => setCraftPeriod(e.target.value)}>
                  <option value="">—</option>
                  {periods.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </label>

              <label>
                <span>MPR</span>
                <input type="number" value={craftMpr} onChange={(e) => setCraftMpr(e.target.value === '' ? '' : parseInt(e.target.value, 10))} />
              </label>
            </div>

            <div className="form-actions">
              <label className="upload-pill">
                <input type="file" accept="image/*" />
                <span>Upload image</span>
              </label>
              <button type="submit" className="craft-pill">Craft</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;


