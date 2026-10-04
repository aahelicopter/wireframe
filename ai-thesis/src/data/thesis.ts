import type { ThesisNode } from '../types'

/**
 * Default thesis tree. Each level is one step further down the AI supply chain:
 * the deeper the node, the more of a physical bottleneck it is and the less
 * crowded the trade tends to be.
 *
 * Starting views only, not a statement of fact. Edit conviction and scarcity in
 * the app and hit Run.
 */
export const DEFAULT_NODES: ThesisNode[] = [
  {
    id: 'ai',
    parentId: null,
    label: 'AI Compute Buildout',
    summary:
      'Hyperscaler, sovereign and neocloud capex keeps rising as training clusters scale and inference demand compounds. Every dollar spent on accelerators pulls dollars through networking, memory, packaging and power.',
    bottleneck: 'Capex is limited by whichever physical input is scarcest at the time: CoWoS, HBM, optics, power.',
    conviction: 5,
    scarcity: 4,
    timing: 'now',
    catalysts: ['Hyperscaler capex guides each quarter', 'Next-gen GPU/ASIC ramps', 'Sovereign AI programs'],
    newsQuery: 'AI capex hyperscaler',
  },

  // ---------- Level 1 ----------
  {
    id: 'accel',
    parentId: 'ai',
    label: 'Accelerators (GPU / ASIC)',
    summary:
      'The direct beneficiaries of AI spend. Merchant GPUs still dominate, while custom ASICs keep gaining share as hyperscalers look for better cost per token.',
    bottleneck: 'Supply is limited by CoWoS and HBM allocation, not by design.',
    conviction: 5,
    scarcity: 3,
    timing: 'now',
    catalysts: ['Rack-scale system ramps', 'Custom ASIC tape-outs', 'Gross margin trajectory'],
    newsQuery: 'AI accelerator GPU ASIC',
  },
  {
    id: 'memory',
    parentId: 'ai',
    label: 'HBM & Memory',
    summary:
      'Each new accelerator generation carries more HBM per package. HBM takes far more wafer capacity per bit than standard DRAM, which tightens the whole memory market.',
    bottleneck: 'Only three HBM suppliers, long qualification cycles, and wafer capacity diverted from commodity DRAM.',
    conviction: 4,
    scarcity: 5,
    timing: 'now',
    catalysts: ['HBM4 qualification', 'DRAM contract pricing', 'HBM capacity sold out ahead'],
    newsQuery: 'HBM memory supply',
  },
  {
    id: 'network',
    parentId: 'ai',
    label: 'AI Networking',
    summary:
      'Clusters are growing from thousands to hundreds of thousands of accelerators. Network spend grows faster than compute because bandwidth per GPU and tiers of switching both increase.',
    bottleneck: 'Optical link capacity and power per bit. Each GPU needs several high-speed optical links.',
    conviction: 5,
    scarcity: 4,
    timing: 'now',
    catalysts: ['1.6T optics ramp', 'Scale-out Ethernet adoption', 'Back-end network attach rates'],
    newsQuery: 'AI networking optical Ethernet',
  },
  {
    id: 'fab',
    parentId: 'ai',
    label: 'Foundry, Packaging & Semicap',
    summary:
      'Leading-edge logic and advanced packaging are the chokepoint for every accelerator, merchant or custom.',
    bottleneck: 'CoWoS capacity and leading-edge node capacity at a single dominant foundry.',
    conviction: 4,
    scarcity: 4,
    timing: 'now',
    catalysts: ['CoWoS capacity adds', '2nm ramp', 'Overseas fab buildout'],
    newsQuery: 'CoWoS advanced packaging capacity',
  },
  {
    id: 'power',
    parentId: 'ai',
    label: 'Power, Cooling & Grid',
    summary:
      'Data centers are now sited by power availability. Gigawatt campuses need firm generation, grid hardware and liquid cooling, all with multi-year lead times.',
    bottleneck: 'Interconnect queues, transformer and turbine lead times, and rack power density.',
    conviction: 4,
    scarcity: 5,
    timing: 'now',
    catalysts: ['Utility large-load agreements', 'Turbine and transformer backlogs', 'Behind-the-meter deals'],
    newsQuery: 'data center power demand grid',
  },
  {
    id: 'cloud',
    parentId: 'ai',
    label: 'AI Clouds & Neoclouds',
    summary:
      'GPU-as-a-service providers turn capex into rented compute. They are the highest-beta way to own AI demand, but also the most levered to financing conditions.',
    bottleneck: 'Access to powered shells and cheap capital.',
    conviction: 3,
    scarcity: 3,
    timing: 'now',
    catalysts: ['Contract backlog announcements', 'Debt financing terms', 'Utilization and pricing per GPU-hour'],
    newsQuery: 'neocloud GPU cloud contract',
  },

  // ---------- Level 2 ----------
  {
    id: 'asic',
    parentId: 'accel',
    label: 'Custom ASIC design partners',
    summary:
      'Hyperscalers design in-house accelerators but rely on partners for SerDes, packaging and physical design. Unit volumes are rising quickly.',
    bottleneck: 'Very few teams can deliver high-speed SerDes plus advanced packaging integration.',
    conviction: 4,
    scarcity: 3,
    timing: '6-12m',
    catalysts: ['New XPU programs', 'Next-gen TPU/Trainium-class ramps'],
    newsQuery: 'custom AI ASIC XPU design win',
  },
  {
    id: 'hbmtools',
    parentId: 'memory',
    label: 'HBM bonding, test & probe',
    summary:
      'Stacking 12-16 DRAM dies needs thermo-compression and, eventually, hybrid bonding, plus far more test steps. Equipment intensity per HBM bit is high.',
    bottleneck: 'Bonder supply and test capacity per stack.',
    conviction: 3,
    scarcity: 4,
    timing: '6-12m',
    catalysts: ['Hybrid bonding adoption for HBM4E', 'TC bonder orders'],
    newsQuery: 'HBM TC bonder hybrid bonding',
  },
  {
    id: 'storage',
    parentId: 'memory',
    label: 'Inference storage (NAND / HDD)',
    summary:
      'Inference and agentic workloads write and keep far more data (KV caches, logs, multimodal). Storage was under-invested for years, so supply is tight.',
    bottleneck: 'Years of low NAND/HDD capex leave little spare capacity.',
    conviction: 3,
    scarcity: 4,
    timing: 'now',
    catalysts: ['Enterprise SSD pricing', 'Nearline HDD lead times'],
    newsQuery: 'enterprise SSD NAND pricing AI inference',
  },
  {
    id: 'switch',
    parentId: 'network',
    label: 'Switch silicon & systems',
    summary:
      'Scale-out fabrics move to 102T switch ASICs and Ethernet. Scale-up domains are growing, which creates new switch sockets.',
    bottleneck: 'Few vendors ship 100T+ switch silicon on time.',
    conviction: 4,
    scarcity: 3,
    timing: 'now',
    catalysts: ['102.4T switch ramps', 'Scale-up Ethernet', 'White-box share gains'],
    newsQuery: 'AI Ethernet switch 102.4T',
  },
  {
    id: 'optics',
    parentId: 'network',
    label: 'Optical transceivers (800G → 1.6T)',
    summary:
      'Every GPU attaches to several optical links. Module units and speeds both rise each generation, so dollars grow faster than GPU units.',
    bottleneck: 'Component supply below the module: lasers, DSPs and InP capacity.',
    conviction: 5,
    scarcity: 5,
    timing: 'now',
    catalysts: ['1.6T volume shipments', '3.2T sampling', 'Module price and margin trends'],
    newsQuery: '1.6T optical transceiver',
  },
  {
    id: 'copper',
    parentId: 'network',
    label: 'Copper, AECs & retimers',
    summary:
      'Inside the rack, copper still wins on cost and power. Active electrical cables and retimers extend copper reach at 200G per lane.',
    bottleneck: 'Signal integrity at 200G/lane. Few vendors have proven parts.',
    conviction: 4,
    scarcity: 4,
    timing: 'now',
    catalysts: ['AEC attach in new racks', 'PCIe 6 / scale-up switch ramps'],
    newsQuery: 'active electrical cable retimer AI',
  },
  {
    id: 'cowos',
    parentId: 'fab',
    label: 'Advanced packaging (CoWoS / SoIC)',
    summary:
      'Accelerators are now multi-die packages. Advanced packaging capacity has been the binding constraint on GPU output.',
    bottleneck: 'Interposer and packaging line capacity.',
    conviction: 4,
    scarcity: 5,
    timing: 'now',
    catalysts: ['CoWoS capacity expansion', 'OSAT outsourcing of back-end steps', 'Panel-level packaging'],
    newsQuery: 'CoWoS capacity OSAT advanced packaging',
  },
  {
    id: 'semicap',
    parentId: 'fab',
    label: 'Leading-edge semicap',
    summary:
      'AI logic and HBM drive wafer fab equipment spend. Lower beta, but a durable way to own the build.',
    bottleneck: 'Lithography and deposition/etch tools for leading-edge and HBM.',
    conviction: 3,
    scarcity: 3,
    timing: '6-12m',
    catalysts: ['WFE outlook', 'High-NA EUV adoption', 'China export rules'],
    newsQuery: 'wafer fab equipment AI demand',
  },
  {
    id: 'onsite',
    parentId: 'power',
    label: 'On-site & firm generation',
    summary:
      'Grid hookups take years, so campuses add behind-the-meter generation (fuel cells, turbines) and sign long-term contracts for nuclear and gas.',
    bottleneck: 'Turbine slots, nuclear licensing and fuel-cell manufacturing capacity.',
    conviction: 3,
    scarcity: 5,
    timing: 'now',
    catalysts: ['Hyperscaler PPAs', 'Fuel cell orders', 'SMR licensing milestones'],
    newsQuery: 'data center behind the meter power fuel cell nuclear',
  },
  {
    id: 'rack',
    parentId: 'power',
    label: 'Rack power & liquid cooling',
    summary:
      'Rack density is heading from about 130kW toward 600kW+. That requires liquid cooling, new power distribution and higher-voltage architectures.',
    bottleneck: 'CDU, switchgear and busway capacity.',
    conviction: 4,
    scarcity: 4,
    timing: 'now',
    catalysts: ['Liquid cooling attach', '800V DC architecture', 'Order backlogs'],
    newsQuery: 'liquid cooling data center CDU',
  },
  {
    id: 'grid',
    parentId: 'power',
    label: 'Grid, transformers & EPC',
    summary:
      'Transmission, substations and the crews to build them are booked out years ahead.',
    bottleneck: 'Transformer and switchgear lead times plus skilled labor.',
    conviction: 4,
    scarcity: 5,
    timing: '6-12m',
    catalysts: ['Utility capex plans', 'Backlog growth', 'Transmission permitting'],
    newsQuery: 'transformer shortage grid data center',
  },
  {
    id: 'powersemi',
    parentId: 'power',
    label: '800V DC power semis (GaN / SiC)',
    summary:
      'Higher rack voltages and power density favor GaN and SiC conversion and high-efficiency power modules. Early, small revenue bases, very high beta.',
    bottleneck: 'Qualified high-voltage designs in next-gen racks.',
    conviction: 3,
    scarcity: 3,
    timing: '12-24m',
    catalysts: ['800V DC rack reference designs', 'Design-win announcements'],
    newsQuery: '800V DC data center GaN SiC',
  },
  {
    id: 'neocloud',
    parentId: 'cloud',
    label: 'Neoclouds',
    summary:
      'Specialist GPU clouds with multi-billion contracted backlogs. Revenue tracks capacity brought online.',
    bottleneck: 'Powered capacity and financing.',
    conviction: 3,
    scarcity: 3,
    timing: 'now',
    catalysts: ['New take-or-pay contracts', 'MW online each quarter'],
    newsQuery: 'neocloud capacity contract',
  },

  // ---------- Level 3 ----------
  {
    id: 'cpo',
    parentId: 'switch',
    label: 'Co-packaged optics (CPO)',
    summary:
      'Moving optics onto the switch package cuts power per bit. It shifts value from pluggable modules toward external laser sources, fiber attach and photonic packaging.',
    bottleneck: 'Laser reliability, fiber attach yield and serviceability.',
    conviction: 4,
    scarcity: 3,
    timing: '12-24m',
    catalysts: ['CPO switch shipments', 'Scale-up CPO adoption', 'External laser source volumes'],
    newsQuery: 'co-packaged optics CPO switch',
  },
  {
    id: 'dsp',
    parentId: 'optics',
    label: 'Optical DSPs (PAM4)',
    summary:
      'Each pluggable module needs a PAM4 DSP. Two or three vendors serve the market, and DSP content per module rises with speed.',
    bottleneck: 'Advanced-node DSP design. Small vendor set.',
    conviction: 4,
    scarcity: 4,
    timing: 'now',
    catalysts: ['1.6T DSP share', 'LPO/LRO adoption (risk)', '3.2T DSPs'],
    newsQuery: 'PAM4 DSP 1.6T optical',
  },
  {
    id: 'lasers',
    parentId: 'optics',
    label: 'Lasers: EML & CW sources',
    summary:
      'High-speed EMLs and high-power CW lasers (for silicon photonics and CPO) are the scarcest optical component. Supply has lagged module demand.',
    bottleneck: 'InP laser fab capacity and yields at 200G per lane.',
    conviction: 5,
    scarcity: 5,
    timing: 'now',
    catalysts: ['EML capacity expansions', '200G/lane EML shipments', 'CW laser demand from CPO'],
    newsQuery: 'EML laser shortage indium phosphide',
  },
  {
    id: 'analog',
    parentId: 'optics',
    label: 'Drivers & TIAs',
    summary: 'Every optical link needs laser drivers and transimpedance amplifiers. Content per module grows with lanes.',
    bottleneck: 'High-speed analog design talent.',
    conviction: 3,
    scarcity: 3,
    timing: '6-12m',
    catalysts: ['1.6T driver/TIA design wins', 'LPO adoption'],
    newsQuery: 'optical driver TIA 200G',
  },
  {
    id: 'siph',
    parentId: 'optics',
    label: 'Silicon photonics foundry',
    summary:
      'Silicon photonics takes share in 1.6T modules and is the base for CPO. Specialty foundries with SiPh process flows benefit.',
    bottleneck: 'Mature SiPh process capacity.',
    conviction: 3,
    scarcity: 3,
    timing: '12-24m',
    catalysts: ['SiPh capacity expansions', 'CPO volume'],
    newsQuery: 'silicon photonics foundry capacity',
  },
  {
    id: 'pkgtools',
    parentId: 'cowos',
    label: 'Packaging tools, inspection & substrates',
    summary:
      'Advanced packaging needs new bonders, inspection/metrology and high-layer-count ABF substrates.',
    bottleneck: 'Inspection throughput and ABF substrate capacity for large packages.',
    conviction: 3,
    scarcity: 4,
    timing: '6-12m',
    catalysts: ['Hybrid bonder orders', 'Packaging inspection tool orders', 'ABF substrate tightness'],
    newsQuery: 'advanced packaging inspection hybrid bonding ABF substrate',
  },

  // ---------- Level 4 ----------
  {
    id: 'inp',
    parentId: 'lasers',
    label: 'Indium phosphide wafers & epi',
    summary:
      'EMLs, CW lasers and photodetectors are built on InP. InP substrates and epitaxy are a narrow industry, moving from 3-inch to 6-inch wafers. China controls key indium and InP export permits.',
    bottleneck: 'InP substrate supply, 6-inch conversion and Chinese export licensing.',
    conviction: 4,
    scarcity: 5,
    timing: '6-12m',
    catalysts: ['6-inch InP fab ramps', 'China export licence decisions', 'Substrate pricing'],
    newsQuery: 'indium phosphide capacity substrate',
  },

  // ---------- Level 5 ----------
  {
    id: 'indium',
    parentId: 'inp',
    label: 'Indium supply',
    summary:
      'Indium is a by-product of zinc refining, and China produces most refined supply. Export controls make non-China refiners strategic.',
    bottleneck: 'By-product supply cannot ramp quickly with price.',
    conviction: 2,
    scarcity: 5,
    timing: '12-24m',
    catalysts: ['China critical-mineral export rules', 'Indium price'],
    newsQuery: 'indium export controls supply',
  },
  {
    id: 'mocvd',
    parentId: 'inp',
    label: 'MOCVD / epi tools',
    summary:
      'Compound-semiconductor epitaxy for lasers runs on MOCVD reactors. InP capacity expansions mean tool orders.',
    bottleneck: 'Few qualified reactor vendors.',
    conviction: 3,
    scarcity: 3,
    timing: '6-12m',
    catalysts: ['Photonics MOCVD orders', 'InP 6-inch tool qualification'],
    newsQuery: 'MOCVD photonics indium phosphide orders',
  },
]
