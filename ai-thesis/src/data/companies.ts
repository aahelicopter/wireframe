import type { Company } from '../types'

/**
 * Starting universe. Beta, size bucket and AI "purity" are rough estimates to
 * seed the model, not live data. Change them in the Universe tab.
 */
type Row = Omit<Company, 'yahoo' | 'usListed'> & { yahoo?: string; usListed?: boolean }

const rows: Row[] = [
  // Accelerators
  { ticker: 'NVDA', name: 'NVIDIA', beta: 1.9, cap: 'mega', purity: 0.9, exposures: [
    { nodeId: 'accel', role: 'Merchant GPU and rack-scale system leader' },
    { nodeId: 'switch', role: 'Spectrum-X / NVLink switching' },
  ] },
  { ticker: 'AMD', name: 'Advanced Micro Devices', beta: 1.9, cap: 'mega', purity: 0.5, exposures: [
    { nodeId: 'accel', role: 'Instinct GPUs, the number two merchant option' },
  ] },
  { ticker: 'AVGO', name: 'Broadcom', beta: 1.3, cap: 'mega', purity: 0.6, exposures: [
    { nodeId: 'asic', role: 'Largest custom XPU partner' },
    { nodeId: 'switch', role: 'Tomahawk / Jericho switch silicon' },
    { nodeId: 'dsp', role: 'PAM4 optical DSPs' },
    { nodeId: 'cpo', role: 'CPO switch platforms' },
  ] },
  { ticker: 'MRVL', name: 'Marvell Technology', beta: 1.9, cap: 'large', purity: 0.7, exposures: [
    { nodeId: 'asic', role: 'Custom XPU and attach silicon' },
    { nodeId: 'dsp', role: 'Leading PAM4 DSP share' },
    { nodeId: 'switch', role: 'Switch silicon' },
  ] },
  { ticker: 'ALCHIP', yahoo: '3661.TW', usListed: false, name: 'Alchip Technologies', beta: 1.6, cap: 'mid', purity: 0.8, exposures: [
    { nodeId: 'asic', role: 'ASIC design services for hyperscaler programs' },
  ] },
  { ticker: 'GUC', yahoo: '3443.TW', usListed: false, name: 'Global Unichip', beta: 1.6, cap: 'mid', purity: 0.7, exposures: [
    { nodeId: 'asic', role: 'ASIC design and CoWoS integration' },
  ] },

  // Memory
  { ticker: 'MU', name: 'Micron Technology', beta: 1.6, cap: 'mega', purity: 0.6, exposures: [
    { nodeId: 'memory', role: 'HBM supplier, US-listed DRAM pure-play' },
  ] },
  { ticker: 'HYNIX', yahoo: '000660.KS', usListed: false, name: 'SK hynix', beta: 1.5, cap: 'mega', purity: 0.7, exposures: [
    { nodeId: 'memory', role: 'HBM share leader' },
  ] },
  { ticker: 'SNDK', name: 'Sandisk', beta: 2.2, cap: 'mid', purity: 0.5, exposures: [
    { nodeId: 'storage', role: 'NAND / enterprise SSD' },
  ] },
  { ticker: 'WDC', name: 'Western Digital', beta: 1.6, cap: 'mid', purity: 0.5, exposures: [
    { nodeId: 'storage', role: 'Nearline HDD' },
  ] },
  { ticker: 'STX', name: 'Seagate Technology', beta: 1.5, cap: 'large', purity: 0.5, exposures: [
    { nodeId: 'storage', role: 'Nearline HDD, HAMR ramp' },
  ] },
  { ticker: 'HANMI', yahoo: '042700.KS', usListed: false, name: 'Hanmi Semiconductor', beta: 2.0, cap: 'mid', purity: 0.8, exposures: [
    { nodeId: 'hbmtools', role: 'TC bonders for HBM stacking' },
  ] },
  { ticker: 'BESI', yahoo: 'BESI.AS', usListed: false, name: 'BE Semiconductor', beta: 1.6, cap: 'mid', purity: 0.6, exposures: [
    { nodeId: 'hbmtools', role: 'Hybrid bonding for future HBM' },
    { nodeId: 'pkgtools', role: 'Hybrid bonders for SoIC / logic' },
  ] },
  { ticker: 'FORM', name: 'FormFactor', beta: 1.6, cap: 'small', purity: 0.4, exposures: [
    { nodeId: 'hbmtools', role: 'HBM probe cards' },
  ] },

  // Networking
  { ticker: 'ANET', name: 'Arista Networks', beta: 1.6, cap: 'large', purity: 0.8, exposures: [
    { nodeId: 'switch', role: 'AI back-end Ethernet switching' },
  ] },
  { ticker: 'CLS', name: 'Celestica', beta: 2.1, cap: 'mid', purity: 0.6, exposures: [
    { nodeId: 'switch', role: 'White-box switches and hyperscaler racks' },
  ] },
  { ticker: 'COHR', name: 'Coherent', beta: 1.9, cap: 'mid', purity: 0.5, exposures: [
    { nodeId: 'optics', role: 'Datacom transceivers' },
    { nodeId: 'lasers', role: 'EML and CW lasers' },
    { nodeId: 'inp', role: 'Vertically integrated 6-inch InP fab' },
    { nodeId: 'cpo', role: 'CPO components' },
  ] },
  { ticker: 'LITE', name: 'Lumentum', beta: 1.7, cap: 'mid', purity: 0.7, exposures: [
    { nodeId: 'lasers', role: 'High-speed EML leader' },
    { nodeId: 'inp', role: 'InP laser fab capacity' },
    { nodeId: 'cpo', role: 'High-power CW / ELS lasers for CPO' },
    { nodeId: 'optics', role: 'Transceivers' },
  ] },
  { ticker: 'FN', name: 'Fabrinet', beta: 1.4, cap: 'mid', purity: 0.6, exposures: [
    { nodeId: 'optics', role: 'Contract manufacturer for optical modules' },
    { nodeId: 'cpo', role: 'Precision optical packaging for CPO' },
  ] },
  { ticker: 'AAOI', name: 'Applied Optoelectronics', beta: 3.0, cap: 'small', purity: 0.7, exposures: [
    { nodeId: 'optics', role: 'US-made transceivers with in-house lasers' },
    { nodeId: 'lasers', role: 'Captive InP laser production' },
  ], note: 'Very high volatility, customer concentration.' },
  { ticker: 'INNOLIGHT', yahoo: '300308.SZ', usListed: false, name: 'Zhongji InnoLight', beta: 1.8, cap: 'large', purity: 0.9, exposures: [
    { nodeId: 'optics', role: 'Largest 800G/1.6T module supplier' },
  ], note: 'China A-share. Access and geopolitical risk.' },
  { ticker: 'EOPTOLINK', yahoo: '300502.SZ', usListed: false, name: 'Eoptolink', beta: 1.9, cap: 'mid', purity: 0.9, exposures: [
    { nodeId: 'optics', role: 'High-speed module supplier' },
  ], note: 'China A-share. Access and geopolitical risk.' },
  { ticker: 'CRDO', name: 'Credo Technology', beta: 2.4, cap: 'mid', purity: 0.9, exposures: [
    { nodeId: 'copper', role: 'Active electrical cable (AEC) leader' },
    { nodeId: 'dsp', role: 'Optical DSPs' },
  ] },
  { ticker: 'ALAB', name: 'Astera Labs', beta: 2.5, cap: 'mid', purity: 0.95, exposures: [
    { nodeId: 'copper', role: 'PCIe/CXL retimers and scale-up switches' },
  ] },
  { ticker: 'APH', name: 'Amphenol', beta: 1.2, cap: 'mega', purity: 0.35, exposures: [
    { nodeId: 'copper', role: 'Rack copper interconnect and cable backplanes' },
  ] },
  { ticker: 'MTSI', name: 'MACOM Technology', beta: 1.6, cap: 'mid', purity: 0.4, exposures: [
    { nodeId: 'analog', role: 'Laser drivers and TIAs' },
  ] },
  { ticker: 'SMTC', name: 'Semtech', beta: 2.0, cap: 'small', purity: 0.4, exposures: [
    { nodeId: 'analog', role: 'Drivers/TIAs, LPO and copper redrivers' },
  ] },
  { ticker: 'TSEM', name: 'Tower Semiconductor', beta: 1.3, cap: 'mid', purity: 0.3, exposures: [
    { nodeId: 'siph', role: 'Leading silicon photonics foundry' },
    { nodeId: 'cpo', role: 'SiPh wafers for CPO engines' },
  ] },
  { ticker: 'GFS', name: 'GlobalFoundries', beta: 1.4, cap: 'mid', purity: 0.15, exposures: [
    { nodeId: 'siph', role: 'Silicon photonics platform' },
  ] },
  { ticker: 'SUMITOMO', yahoo: '5802.T', usListed: false, name: 'Sumitomo Electric', beta: 1.1, cap: 'large', purity: 0.2, exposures: [
    { nodeId: 'lasers', role: 'EML / laser supplier' },
    { nodeId: 'inp', role: 'InP substrates' },
  ] },
  { ticker: 'AXTI', name: 'AXT Inc', beta: 2.6, cap: 'small', purity: 0.7, exposures: [
    { nodeId: 'inp', role: 'InP substrate maker' },
  ], note: 'Manufacturing in China. Export licences drive shipments.' },
  { ticker: 'IQE', yahoo: 'IQE.L', usListed: false, name: 'IQE plc', beta: 2.0, cap: 'small', purity: 0.5, exposures: [
    { nodeId: 'inp', role: 'Compound semi epitaxy wafers (InP/GaAs)' },
  ], note: 'London listing. Check corporate actions.' },
  { ticker: 'KOREAZINC', yahoo: '010130.KS', usListed: false, name: 'Korea Zinc', beta: 1.0, cap: 'large', purity: 0.05, exposures: [
    { nodeId: 'indium', role: 'Major non-China indium refiner' },
  ] },
  { ticker: 'TECK', name: 'Teck Resources', beta: 1.3, cap: 'large', purity: 0.02, exposures: [
    { nodeId: 'indium', role: 'Indium by-product from Trail refinery' },
  ], note: 'Indium is immaterial to revenue. Strategic optionality only.' },
  { ticker: 'AIXTRON', yahoo: 'AIXA.DE', usListed: false, name: 'Aixtron', beta: 1.6, cap: 'mid', purity: 0.3, exposures: [
    { nodeId: 'mocvd', role: 'MOCVD reactors for InP/GaAs photonics' },
  ] },
  { ticker: 'VECO', name: 'Veeco Instruments', beta: 1.6, cap: 'small', purity: 0.2, exposures: [
    { nodeId: 'mocvd', role: 'MOCVD and deposition tools' },
  ] },

  // Foundry & packaging
  { ticker: 'TSM', name: 'Taiwan Semiconductor', beta: 1.3, cap: 'mega', purity: 0.6, exposures: [
    { nodeId: 'fab', role: 'Sole leading-edge foundry for accelerators' },
    { nodeId: 'cowos', role: 'CoWoS / SoIC owner' },
    { nodeId: 'cpo', role: 'COUPE photonic engine platform' },
  ] },
  { ticker: 'AMKR', name: 'Amkor Technology', beta: 1.9, cap: 'mid', purity: 0.3, exposures: [
    { nodeId: 'cowos', role: 'OSAT for advanced packaging, US capacity' },
  ] },
  { ticker: 'ASX', name: 'ASE Technology', beta: 1.4, cap: 'large', purity: 0.3, exposures: [
    { nodeId: 'cowos', role: 'Largest OSAT, CoWoS back-end' },
  ] },
  { ticker: 'ASML', name: 'ASML Holding', beta: 1.4, cap: 'mega', purity: 0.3, exposures: [
    { nodeId: 'semicap', role: 'EUV lithography monopoly' },
  ] },
  { ticker: 'LRCX', name: 'Lam Research', beta: 1.6, cap: 'mega', purity: 0.3, exposures: [
    { nodeId: 'semicap', role: 'Etch/dep, HBM TSV exposure' },
  ] },
  { ticker: 'AMAT', name: 'Applied Materials', beta: 1.6, cap: 'mega', purity: 0.3, exposures: [
    { nodeId: 'semicap', role: 'Broadest WFE portfolio' },
  ] },
  { ticker: 'KLAC', name: 'KLA Corp', beta: 1.4, cap: 'mega', purity: 0.3, exposures: [
    { nodeId: 'semicap', role: 'Process control' },
  ] },
  { ticker: 'CAMT', name: 'Camtek', beta: 1.8, cap: 'small', purity: 0.5, exposures: [
    { nodeId: 'pkgtools', role: 'Advanced packaging / HBM inspection' },
  ] },
  { ticker: 'ONTO', name: 'Onto Innovation', beta: 1.6, cap: 'mid', purity: 0.4, exposures: [
    { nodeId: 'pkgtools', role: 'Packaging lithography and metrology' },
  ] },
  { ticker: 'IBIDEN', yahoo: '4062.T', usListed: false, name: 'Ibiden', beta: 1.4, cap: 'mid', purity: 0.6, exposures: [
    { nodeId: 'pkgtools', role: 'ABF substrates for GPUs' },
  ] },

  // Power
  { ticker: 'BE', name: 'Bloom Energy', beta: 2.5, cap: 'mid', purity: 0.5, exposures: [
    { nodeId: 'onsite', role: 'Behind-the-meter fuel cells' },
  ] },
  { ticker: 'GEV', name: 'GE Vernova', beta: 1.5, cap: 'mega', purity: 0.35, exposures: [
    { nodeId: 'onsite', role: 'Gas turbines, sold out for years' },
    { nodeId: 'grid', role: 'Grid equipment' },
  ] },
  { ticker: 'VST', name: 'Vistra', beta: 1.5, cap: 'large', purity: 0.3, exposures: [
    { nodeId: 'onsite', role: 'Merchant nuclear + gas for data center PPAs' },
  ] },
  { ticker: 'CEG', name: 'Constellation Energy', beta: 1.2, cap: 'large', purity: 0.3, exposures: [
    { nodeId: 'onsite', role: 'Largest US nuclear fleet' },
  ] },
  { ticker: 'TLN', name: 'Talen Energy', beta: 1.4, cap: 'mid', purity: 0.4, exposures: [
    { nodeId: 'onsite', role: 'Nuclear co-located data center deals' },
  ] },
  { ticker: 'OKLO', name: 'Oklo', beta: 3.0, cap: 'small', purity: 0.4, exposures: [
    { nodeId: 'onsite', role: 'Advanced fission, pre-revenue' },
  ], note: 'Pre-revenue. Licensing risk.' },
  { ticker: 'SMR', name: 'NuScale Power', beta: 2.8, cap: 'small', purity: 0.25, exposures: [
    { nodeId: 'onsite', role: 'SMR design' },
  ], note: 'Pre-revenue at scale.' },
  { ticker: 'VRT', name: 'Vertiv', beta: 1.9, cap: 'large', purity: 0.7, exposures: [
    { nodeId: 'rack', role: 'Thermal and power infrastructure leader' },
  ] },
  { ticker: 'ETN', name: 'Eaton', beta: 1.2, cap: 'mega', purity: 0.25, exposures: [
    { nodeId: 'rack', role: 'Switchgear, UPS, 800V DC' },
    { nodeId: 'grid', role: 'Electrical distribution' },
  ] },
  { ticker: 'MOD', name: 'Modine', beta: 1.9, cap: 'mid', purity: 0.4, exposures: [
    { nodeId: 'rack', role: 'Data center cooling' },
  ] },
  { ticker: 'NVT', name: 'nVent Electric', beta: 1.4, cap: 'mid', purity: 0.35, exposures: [
    { nodeId: 'rack', role: 'Liquid cooling and enclosures' },
  ] },
  { ticker: 'PWR', name: 'Quanta Services', beta: 1.1, cap: 'mega', purity: 0.25, exposures: [
    { nodeId: 'grid', role: 'Largest grid EPC contractor' },
  ] },
  { ticker: 'POWL', name: 'Powell Industries', beta: 1.6, cap: 'small', purity: 0.35, exposures: [
    { nodeId: 'grid', role: 'Custom switchgear' },
  ] },
  { ticker: 'NVTS', name: 'Navitas Semiconductor', beta: 3.0, cap: 'small', purity: 0.4, exposures: [
    { nodeId: 'powersemi', role: 'GaN/SiC for 800V DC racks' },
  ], note: 'Early revenue. Very high volatility.' },
  { ticker: 'MPWR', name: 'Monolithic Power', beta: 1.4, cap: 'large', purity: 0.35, exposures: [
    { nodeId: 'powersemi', role: 'Accelerator power delivery' },
  ] },
  { ticker: 'VICR', name: 'Vicor', beta: 2.2, cap: 'small', purity: 0.5, exposures: [
    { nodeId: 'powersemi', role: 'High-density power modules' },
  ] },
  { ticker: 'ON', name: 'onsemi', beta: 1.6, cap: 'large', purity: 0.15, exposures: [
    { nodeId: 'powersemi', role: 'SiC and power management' },
  ] },

  // Clouds
  { ticker: 'CRWV', name: 'CoreWeave', beta: 2.8, cap: 'large', purity: 1.0, exposures: [
    { nodeId: 'neocloud', role: 'Largest neocloud, multi-year backlog' },
  ], note: 'High leverage.' },
  { ticker: 'NBIS', name: 'Nebius Group', beta: 2.8, cap: 'mid', purity: 0.9, exposures: [
    { nodeId: 'neocloud', role: 'Full-stack AI cloud' },
  ] },
  { ticker: 'IREN', name: 'IREN Ltd', beta: 3.2, cap: 'mid', purity: 0.6, exposures: [
    { nodeId: 'neocloud', role: 'Bitcoin miner pivoting powered sites to AI cloud' },
  ] },
  { ticker: 'ORCL', name: 'Oracle', beta: 1.3, cap: 'mega', purity: 0.4, exposures: [
    { nodeId: 'cloud', role: 'OCI capacity for frontier labs' },
  ] },
]

export const DEFAULT_COMPANIES: Company[] = rows.map((r) => ({
  ...r,
  yahoo: r.yahoo ?? r.ticker,
  usListed: r.usListed ?? true,
}))
