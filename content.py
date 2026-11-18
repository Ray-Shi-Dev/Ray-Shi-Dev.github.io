"""All site copy lives here. Edit this file, then run `python3 build.py`."""

SITE = {
    "name": "Ray Shi",
    "url": "https://ray-shi-dev.github.io",
    "role": "Data Scientist & Computational Engineer",
    "description": "Ray Shi is a data scientist and computational engineer: Python pipelines, machine learning, simulation and spatial data. Research assistant in Computer Science at National Cheng Kung University.",
    "email": "ray.ecodesigner@gmail.com",
    "linkedin": "https://www.linkedin.com/in/ray-shi-b633302a8",
    "github": "https://github.com/Ray-Shi-Dev",
    "intro": "I'm a data scientist and computational engineer. I build Python data pipelines, machine-learning models and simulation tools, grounded in two years of building-physics work at Arup and a research background in spatial statistics.",
    "now": [
        ("Now", "Research Assistant, Computer Science, NCKU NetDB Lab"),
        ("Previously", "Computational Energy Specialist, Arup"),
        ("Stack", "Python, SQL, pandas, scikit-learn, Git, Docker"),
    ],
}

GROUPS = [
    ("software", "Software and machine learning", "Open-source projects on GitHub: data pipelines, model ensembles, geometry automation and a data product."),
    ("simulation", "Simulation and spatial data", "Energy, climate, satellite and spatial-statistics models built for professional projects and research."),
    ("design", "Earlier work: urban design", "Masterplans and buildings from my architecture and urban design training."),
]

PROJECTS = [
    {
        "slug": "vectorized-timeseries-scaling",
        "kind": "software",
        "tags": "pandas, NumPy, LightGBM, XGBoost, CatBoost",
        "group": "software",
        "repo": "vectorized-timeseries-scaling",
        "title": "Scaling an energy anomaly-detection pipeline",
        "summary": "Rewrote the data preparation of a prize-winning time-series pipeline with vectorised group transforms: 72% faster, 1.4 GB less peak memory, and a fitting bug fixed along the way.",
        "facts": [
            ("Type", "Performance engineering, machine learning"),
            ("Stack", "Python, pandas, NumPy, SciPy, LightGBM, XGBoost, CatBoost"),
            ("Data", "LEAD building-energy time series"),
            ("Code", "github.com/Ray-Shi-Dev/vectorized-timeseries-scaling"),
        ],
        "cover_alt": "Bar chart comparing run time of the iterative pipeline, 26.6 minutes, with the vectorised pipeline, 7.3 minutes",
        "results": [
            ("Wall-clock time", "26.6 min", "7.3 min", "72% faster"),
            ("Peak memory", "21.7 GB", "20.3 GB", "1.4 GB less"),
            ("Kaggle private score", "0.933", "0.952", "+0.019"),
            ("Kaggle public score", "0.893", "0.914", "+0.022"),
        ],
        "results_head": ("Metric", "Iterative", "Vectorised", "Change"),
        "highlights": [
            "Loops of slice-transform-concat replaced with groupby().transform()",
            "Benchmarked end to end with an automated time and memory tracker",
            "Found and fixed a subset-fitting bug in the iterative version",
        ],
        "body": [
            ("", "The pipeline is the winning solution to the Large-scale Energy Anomaly Detection (LEAD) competition by Chun Fu, Pandarasamy Arjunan and Clayton Miller (BuildSys '22). It works well on benchmark data with a few hundred meters, but a practical case needed 2,000 streams, about ten times more, and the data preparation became the bottleneck."),
            ("Approach", "The original code isolates each meter, slices a sub-DataFrame, applies mean imputation and Savitzky-Golay smoothing, appends the result and concatenates everything at the end. I replaced that with vectorised groupby().transform() calls, so the maths runs across all groups at once on pandas' compiled backend over contiguous arrays, following the design argument in Wes McKinney's original pandas paper. The output feeds the same LightGBM, XGBoost and CatBoost ensemble."),
            ("Results", "On a standard Kaggle Linux container the vectorised version ran in 7.3 minutes instead of 26.6 and peaked 1.4 GB lower, because it stops creating and destroying temporary DataFrames. The goal was strict parity in accuracy. While checking parity I found that the iterative version was fitting on subsets of the data; with that fixed, the private leaderboard score rose from 0.933 to 0.952."),
        ],
        "gallery": [("vectorized-timeseries-scaling/leaderboard.webp", "Kaggle submissions: vectorised pipeline (top) and the original reproduction (bottom)")],
        "code": None,
        "related": [],
    },
    {
        "slug": "ml-stat-arb",
        "kind": "software",
        "tags": "scikit-learn, LightGBM, statsmodels, yfinance",
        "group": "software",
        "repo": "ml-stat-arb",
        "title": "Machine-learning pairs trading for PropTech",
        "summary": "Tests whether gradient-boosting pipelines built for building-energy time series can detect cointegration breakdowns between real-estate stocks and turn them into trading signals.",
        "facts": [
            ("Type", "Machine learning, quantitative finance"),
            ("Stack", "Python, pandas, statsmodels, scikit-learn, LightGBM, XGBoost, CatBoost"),
            ("Data", "Daily prices via yfinance, e.g. PLD and AMT"),
            ("Code", "github.com/Ray-Shi-Dev/ml-stat-arb"),
        ],
        "cover_alt": "Diagram of the pipeline: price data, lag and rolling features with Savitzky-Golay smoothing, a gradient-boosting ensemble, and trading rules at two and three standard deviations",
        "highlights": [
            "Pairs trading framed as anomaly detection on the spread",
            "Lag, rolling-window and Savitzky-Golay features",
            "Modular pipeline: loader, features, clustering, ensemble, backtest",
        ],
        "body": [
            ("", "This started while I was reproducing Prof. Chun Fu's workflows for the ASHRAE Great Energy Predictor III and LEAD competitions. Gradient-boosting machines with careful time-series features win those problems, and pairs trading is a kind of anomaly detection: you look for moments when the spread between two related assets breaks from its history. So I tested whether the same pipeline transfers to financial time series, using PropTech and REIT pairs such as Prologis (PLD) and American Tower (AMT)."),
            ("Method", "Prices are cleaned and turned into a feature matrix of time-lag features, ratios and differences, and rolling-window statistics. A Savitzky-Golay filter smooths microstructure noise while keeping the height of real peaks in the spread, which a moving average would flatten and delay. An ensemble of LightGBM and XGBoost models predicts the spread, and the trading logic enters when it moves beyond two standard deviations and stops out beyond three."),
            ("Engineering", "The code is split into a data loader, feature builder, clustering step, model ensemble and backtester, configured from one YAML file. A notebook walks through the exploratory analysis, the smoothing and the model training."),
        ],
        "gallery": [],
        "code": None,
        "related": [],
    },
    {
        "slug": "rhino-wwr-automation",
        "kind": "software",
        "tags": "Python, Rhino.Geometry, computational geometry",
        "group": "software",
        "repo": "rhino-wwr-automation",
        "title": "Window-to-wall ratio extractor for Rhino",
        "summary": "A fault-tolerant geometry parser that reads per-floor window-to-wall ratios straight from 3D thermal massing models and exports simulation-ready CSV.",
        "facts": [
            ("Type", "Computational geometry, automation"),
            ("Stack", "Python, RhinoScriptSyntax, Rhino.Geometry"),
            ("Used for", "Energy models, LEED and EEWH submissions"),
            ("Code", "github.com/Ray-Shi-Dev/rhino-wwr-automation"),
        ],
        "cover_alt": "Rhino model of a high-rise tower with thermal zones and glazing coloured by layer",
        "highlights": [
            "Treats the model as a data structure, not a drawing",
            "Survives slab holes, micro-gaps and multi-storey zones",
            "Distributes multi-floor glazing by vertical overlap",
        ],
        "body": [
            ("", "Window-to-wall ratio is a basic input to every energy model and green-building submission, and measuring it by hand is slow. Architectural models are built to look right, not to be measured: slabs have holes for cores and shafts, thermal zones leave 1 to 10 mm gaps that break Boolean unions, and atriums or curtain walls span several floors."),
            ("How it works", "The script scans layers automatically, separating thermal zones, underground zones and glazing. It sorts zones by elevation with a 1.5 m tolerance and ignores artefacts under 2 m to find the true floors. For each floor it slices the massing at 1.2 m above the slab, unions the section curves with a 0.1 m tolerance and keeps the largest outer ring as the facade perimeter. Glazing that spans floors is split by how much of its bounding box overlaps each storey. Redraw is switched off while it runs, and the result is saved as a per-floor CSV."),
        ],
        "gallery": [("rhino-wwr-automation/csv-output.webp", "Per-floor CSV output: elevation, height, perimeter, wall area, glazing area and WWR")],
        "code": None,
        "related": [],
    },
    {
        "slug": "youtube-market-engine",
        "kind": "software",
        "tags": "Streamlit, Plotly, YouTube Data API, concurrency",
        "group": "software",
        "repo": "youtube-market-engine",
        "title": "YouTube market intelligence engine",
        "summary": "A Streamlit data product that pulls YouTube data in parallel, isolates videos that beat their own channel's baseline and scores how open a niche is from 0 to 100.",
        "facts": [
            ("Type", "Data product, analytics"),
            ("Stack", "Python, Streamlit, pandas, Plotly, YouTube Data API v3"),
            ("Concurrency", "ThreadPoolExecutor for parallel API calls"),
            ("Code", "github.com/Ray-Shi-Dev/youtube-market-engine"),
        ],
        "cover_alt": "Diagram of the viral multiplier, a video's views divided by its channel's median views, and the three parts of the niche score",
        "highlights": [
            "Parallel API ingestion across channels",
            "Viral multiplier: views over the channel's median",
            "Niche score with a penalty for markets dominated by large channels",
        ],
        "body": [
            ("", "Creators usually pick topics by instinct, which fails in crowded markets. This tool measures the barrier to entry for a topic with live data, so a high-demand, low-competition niche stands out and a market held by a few giant channels is flagged."),
            ("How it works", "For a topic and region it finds the top channels, then fetches their upload playlists and statistics in parallel with a thread pool to cut ingestion time. Each video gets a viral multiplier, its views divided by the median views of its own channel, so demand is measured independently of subscriber count. The niche score rewards market depth (how many outliers exist) and viral intensity (how strong they are), and applies a penalty when channels with more than a million subscribers hold over half the market."),
            ("Interface", "The Streamlit app has a single-topic dashboard with a score gauge, an opportunity map of upload date against viral multiplier, a tag explorer for long-tail keywords, and a head-to-head comparison of two topics."),
        ],
        "gallery": [
            ("youtube-market-engine/dashboard.webp", "Market health check with the 0 to 100 opportunity score"),
            ("youtube-market-engine/opportunity-map.webp", "Opportunity map and ranked videos"),
            ("youtube-market-engine/tags.webp", "Opportunity categories and hidden keyword frequency"),
            ("youtube-market-engine/battle.webp", "Head-to-head comparison of two topics"),
        ],
        "code": None,
        "related": [],
    },
    {
        "slug": "arup-energy-climate-modelling",
        "tags": "EnergyPlus, LightStanza, OpenFOAM",
        "group": "simulation",
        "title": "Energy and climate modelling at Arup",
        "summary": "Energy, daylight, solar and airflow simulations that guide sustainable building design and LEED submissions.",
        "facts": [
            ("Location", "Taipei, Taiwan"),
            ("Context", "Arup, Computational Energy Specialist, 2024 to 2026"),
            ("Standards", "LEED v4, ASHRAE 90.1 and 62.1, EEWH"),
            ("Tools", "Grasshopper, Honeybee, EnergyPlus, LightStanza, OpenFOAM, ParaView"),
        ],
        "cover_alt": "CFD render of airflow around a high-rise tower, with wind speed shown from red to blue",
        "highlights": [
            "Grasshopper scripts that build thermal zones, adjacencies and windows automatically",
            "EnergyPlus models with ASHRAE 90.1 and 62.1 schedules",
            "Annual daylight metrics for LEED v4: sDA, ASE and glare",
            "Facade PV potential and OpenFOAM airflow studies",
        ],
        "body": [
            ("", "At Arup I ran the environmental and energy simulations behind sustainable design decisions and policy-driven assessments: whole-building energy models, annual daylight studies, facade solar radiation for photovoltaics, and computational fluid dynamics."),
            ("Energy models", "I automated model setup in Grasshopper. The scripts extrude floor plates into thermal zones, intersect them with facade and core masses, solve every surface's boundary condition, and generate windows from a target window-to-wall ratio before writing the model to .hbjson. In EnergyPlus I configured plant loops, HVAC systems, daylight controls and ASHRAE 90.1/62.1 schedules, then compared end-use breakdowns and optimisation strategies against baseline models."),
            ("Daylight and solar", "LightStanza runs annual Radiance-based daylight simulations on models brought in from Revit or Rhino. Its outputs, including spatial daylight autonomy, annual sunlight exposure, illuminance grids and glare maps, support LEED v4 daylight credits. Facade radiation maps combined with PV module specifications estimate how much of a building's demand facade-mounted solar can offset."),
            ("Airflow", "For CFD I used Butterfly and Ladybug in Grasshopper with OpenFOAM: set inlet, outlet and turbulence conditions, refine the mesh around facades and openings, and post-process velocity, pressure and streamlines in ParaView to find comfort zones and judge ventilation."),
        ],
        "code": None,
        "related": ["rhino-wwr-automation"],
    },
    {
        "slug": "remote-sensing-west-coast",
        "tags": "Google Earth Engine, Sentinel-2, Sentinel-5P",
        "group": "simulation",
        "title": "Remote sensing for environmental monitoring",
        "summary": "Open satellite data and Google Earth Engine used to track air and water quality along an industrial coastline.",
        "facts": [
            ("Location", "Taiwan's west coast"),
            ("Area", "400,000 ha"),
            ("Period studied", "2020 to 2023"),
            ("Tools", "Google Earth Engine, Sentinel-2, Sentinel-5P"),
        ],
        "cover_alt": "Satellite map of 2021 nitrogen dioxide concentration over the coast of southwest Taiwan, highest near the industrial shoreline",
        "highlights": [
            "No field survey required",
            "One script reruns for any date range",
            "NO₂ from Sentinel-5P, river turbidity from Sentinel-2",
        ],
        "body": [
            ("", "I grew up on Taiwan's west coast, where rivers and farmland sit beside dense industry. Air and water quality are long-running concerns there, yet monitoring still relies on field surveys and consultant simulations that are slow and expensive. This independent project tests a cheaper, repeatable alternative built on open satellite data."),
            ("Air", "Nitrogen dioxide is a key marker of industrial and traffic emissions. I filtered Copernicus Sentinel-5P NO₂ column density in Google Earth Engine, averaged it by year and clipped it to the study area to compare 2020 through 2023."),
            ("Water", "Turbidity stands in for river health. From Sentinel-2 imagery I built a water mask with NDWI (green and near-infrared bands, thresholded, converted to polygons and dissolved), then applied NDTI (red and green bands) to water pixels only. The date range is a parameter, so the same script produces any year for comparison."),
        ],
        "code": """// Sentinel-2, cloud-filtered median for the study area
var s2 = ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
  .select(['B3', 'B4', 'B8'])
  .filterDate('2023-01-01', '2023-12-31')
  .filterBounds(AOI)
  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 10))
  .median()
  .multiply(0.0001);

// Water mask from NDWI, turbidity from NDTI
var ndwi = s2.normalizedDifference(['B3', 'B8']).rename('NDWI');
var water = ndwi.gt(0).rename('watermask');
var ndti = s2.normalizedDifference(['B4', 'B3']).rename('NDTI');
var turbidity = ndti.updateMask(water);""",
        "related": [],
    },
    {
        "slug": "sme-spatial-analysis-taipei",
        "tags": "Moran's I, regression, bivariate LISA",
        "group": "simulation",
        "title": "Where small businesses cluster in Taipei",
        "summary": "Spatial autocorrelation, regression and bivariate LISA show that banks and commercial land, not transit, decide where SMEs locate.",
        "facts": [
            ("Location", "Taipei, Taiwan"),
            ("Area", "27,000 ha"),
            ("Unit of analysis", "Village (li)"),
            ("Methods", "Bivariate Moran's I, multiple linear regression, bivariate LISA"),
        ],
        "cover_alt": "Map of Taipei villages coloured by bivariate LISA cluster type",
        "highlights": [
            "Banks and commercial land significant at p < 0.05",
            "Transit and population density showed spatially random links and were dropped",
            "Hotspots in Neihu Technology Park and the Taipei Station hub",
        ],
        "body": [
            ("", "Small and medium-sized enterprises drive much of Taiwan's income and employment, and the Ministry of Economic Affairs ranks business-district location as the factor that has mattered most to their success over the past decade. This study asks which conditions draw them to particular parts of Taipei."),
            ("Method", "Using villages as the unit, I tested company density against population density, street intersections, MRT stations, bus stops, banks and commercial land. Bivariate Moran's I with permutation tests screened out variables whose relationship was spatially random. A multiple linear regression tested what remained, and bivariate LISA mapped where each relationship clusters."),
            ("Findings", "Banks and commercial land were the significant predictors. The filtered model had a higher adjusted R² than the full one. High-high hotspots sit in Neihu Technology Park, near Songshan Airport, in the Nanjing–Fuxing financial district and around Taipei Station; cold spots follow the hills and reserves of Beitou, Shilin, Nangang and Wenshan. Economic factors outweigh the built environment, which points SME policy toward banking access and commercial zoning."),
        ],
        "code": None,
        "related": [],
    },
    {
        "slug": "urban-oasis-uhi",
        "tags": "UTCI simulation, Python, Grasshopper",
        "group": "simulation",
        "title": "Urban Oasis: cooling Manchester's streets",
        "summary": "A dissertation that tests heat-mitigation toolkits on narrow city-centre streets with thermal-comfort simulation, then turns the results into a masterplan and design guide.",
        "facts": [
            ("Location", "Manchester city centre, UK"),
            ("Area", "10 ha"),
            ("Context", "MSc dissertation, The University of Manchester, 2023"),
            ("Methods", "Automated UTCI simulation in Python, Rhino and Grasshopper"),
        ],
        "cover_alt": "Axonometric of Manchester city-centre streets with surface temperature shown from blue to red",
        "highlights": [
            "An automated UTCI simulation workflow in Python, Rhino and Grasshopper",
            "Modular sidewalk prototypes combining shade, greenery and water",
            "A prioritisation model for where shade goes first",
        ],
        "body": [
            ("", "Replacing vegetation with hard surfaces makes cities several degrees warmer than the countryside around them. Manchester, shaped by industry and short on green space, feels this sharply in summer. This dissertation builds a repeatable workflow for retrofitting narrow streets to keep people comfortable."),
            ("Analysis", "I built an automated Universal Thermal Climate Index (UTCI) simulation workflow in Python, Rhino and Grasshopper and used it to find hotspots across the city centre. Studies of urban fabric and traffic around the Arndale Centre, Market Street and Shudehill set the context, and eight design principles followed: bioclimatic design, urban geometry, thermal comfort, walkability, sustainability, cultural context, activity and safety."),
            ("Testing", "Combinations of shading, green infrastructure and blue infrastructure were simulated as modular sidewalk prototypes, then tested in three implementation scenarios based on current street policy. The best fit for each street became the final masterplan, a decision-making toolkit and a design guide for Manchester's varied streets."),
        ],
        "code": None,
        "related": [],
    },
    {
        "slug": "upper-brook-street",
        "tags": "Masterplanning, public realm",
        "group": "design",
        "title": "A new quarter for Upper Brook Street",
        "summary": "A 3.2-hectare masterplan that replaces vacant buildings with a walkable mixed-use neighbourhood between Manchester's campuses and city centre.",
        "facts": [
            ("Location", "Manchester, UK"),
            ("Area", "3.2 ha"),
            ("Context", "MSc studio, The University of Manchester"),
            ("Programme", "About 1,320 homes, offices, retail, community centre"),
        ],
        "cover_alt": "Street-level render of a tree-lined pedestrian street between brick apartment blocks",
        "highlights": [
            "Pedestrian priority and a connected public-space network",
            "Two phases at 200 and 110 dwellings per hectare",
            "Green infrastructure and drainage that also buffer noise",
        ],
        "body": [
            ("", "The site sits between Manchester's north and south campuses and the city centre, yet abandoned buildings and traffic-heavy roads cut it off. The masterplan replaces them with a liveable quarter built around pedestrian priority, sustainable transport and well-connected public space."),
            ("Process", "Strategic and area analysis covered policy, socio-economic context, routes, uses, green and blue infrastructure, and heritage. A SWOT and an opportunities-and-constraints map led to eight design objectives, which were weighed against each other through design options before the final plan was chosen."),
            ("Proposal", "Perimeter blocks deliver around 1,320 homes across two phases, with 26,300 m² of offices, ground-floor retail and a community centre. New green infrastructure fills gaps in the existing network, Gartside Garden becomes a shared community space, and a clear street hierarchy with passive surveillance keeps the public realm safe."),
        ],
        "code": None,
        "related": [],
    },
    {
        "slug": "clayton-esplanade",
        "tags": "Masterplanning, CPTED, SuDS",
        "group": "design",
        "title": "Clayton Esplanade masterplan",
        "summary": "A canalfront mixed-use neighbourhood that brings health, work and recreation to an east Manchester suburb facing deprivation.",
        "facts": [
            ("Location", "Clayton, Manchester, UK"),
            ("Area", "22 ha"),
            ("Context", "MSc studio, The University of Manchester"),
            ("Themes", "Mixed-use blocks, CPTED, sustainable drainage"),
        ],
        "cover_alt": "Render of a canalside path with new apartment buildings and people walking",
        "highlights": [
            "A new service centre on the canalfront",
            "Vertical and horizontal mixed-use block types",
            "A road hierarchy that separates recreation from traffic",
        ],
        "body": [
            ("", "Clayton is a suburb in east Manchester. Following the Manchester Core Strategy and the Eastlands regeneration plans, this masterplan aims to reduce deprivation and raise quality of life by building a sustainable community around the canal."),
            ("Proposal", "A new service centre on the canalfront gathers health, employment and leisure. Block types mix uses vertically and horizontally, and heights and density step to suit their surroundings. A public-space network serves visitors, residents and commuters, the road hierarchy gives the recreation corridor its own route, and the scheme applies crime prevention through environmental design (CPTED) and sustainable urban drainage (SuDS)."),
        ],
        "code": None,
        "related": [],
    },
    {
        "slug": "daxi-cultural-quarters",
        "tags": "Heritage, architectural design",
        "group": "design",
        "title": "Daxi Cultural Quarters",
        "summary": "A block design for a historic Japanese-era town that gives young residents places to live and work without erasing the street's character.",
        "facts": [
            ("Location", "Daxi, Taoyuan, Taiwan"),
            ("Site area", "430 m²"),
            ("Context", "Architecture design studio"),
            ("Themes", "Heritage, vertical public space, mixed communities"),
        ],
        "cover_alt": "Collage of Daxi's historic rooftops laid out as a model on a gridded platform with figures looking on",
        "highlights": [
            "Colonnaded walkways and building patterns studied block by block",
            "Gehl's public-space theory translated into corridors, stairs and courtyards",
            "Three building types for different communities",
        ],
        "body": [
            ("", "Daxi's old streets bring together everyday commerce on Central and Zhongzheng Roads, artisans on Zhongshan and Denglong Roads, and an ageing community. Over time these groups and uses drifted apart, and piecemeal change wore down the town's character."),
            ("Design", "The project studies the colonnaded walkways and individual building patterns, then turns Gehl's public-space theory vertical: corridors, staircases and courtyards form a new shared network. Building masses are sorted into three types for different communities, with a care station, a convenience store and catering at street level. Sections and details resolve structural tree planting, drainage and daylight."),
        ],
        "code": None,
        "related": [],
    },
]

REPOS = [
    {
        "slug": "ml-stat-arb",
        "title": "Machine-learning pairs trading for PropTech",
        "text": "Ports gradient-boosting and time-series feature pipelines from building-energy prediction to spotting cointegration breakdowns between REITs.",
        "lang": "Python",
    },
    {
        "slug": "vectorized-timeseries-scaling",
        "title": "Scaling energy anomaly detection",
        "text": "Rewrites a winning BuildSys '22 pipeline with vectorised group transforms so it handles 2,000+ time series, about ten times the benchmark.",
        "lang": "Python",
    },
    {
        "slug": "rhino-wwr-automation",
        "title": "Window-to-wall ratio extractor for Rhino",
        "text": "Reads window-to-wall ratios straight from thermal massing models, coping with cores, micro-gaps and multi-storey zones, for LEED and EEWH work.",
        "lang": "Python, Rhino",
    },
    {
        "slug": "youtube-market-engine",
        "title": "YouTube market intelligence engine",
        "text": "A Streamlit app that pulls YouTube API data in parallel, flags viral outliers and scores how crowded a niche is.",
        "lang": "Python, Streamlit",
    },
]

# Add ventures here when they launch:
# {"name": "...", "text": "One sentence on what it does.", "url": "https://...", "status": "Live"}
VENTURES = []

ABOUT = {
    "bio": [
        "I came to computing through the built environment. Architecture taught me to design, urban planning taught me econometrics and spatial statistics, and two years at Arup turned simulation into code: I automated energy models, wrote geometry parsers and built analysis pipelines in Python.",
        "Now I'm moving into computer science full time. As a research assistant at NCKU's NetDB Lab I'm working through data structures and computer architecture and preparing the stack for data-mining and distributed-ledger projects. On the side I build open-source tools that carry methods between fields, from building-energy machine learning to finance.",
        "Before that I trained large language models with RLHF at Outlier. Away from the screen I read about neuroscience, psychology and financial engineering, and I played left wing for my university football team.",
    ],
}

EXPERIENCE = [
    {
        "years": "2026 – now",
        "role": "Research Assistant, Computer Science and Information Engineering",
        "org": "National Cheng Kung University, NetDB Lab (Advanced Network Database Lab), Tainan",
        "text": "Building core computer-science foundations through credit courses in Data Structures (Prof. Mu-Yen Chen) and Computer Architecture and Assembly Language (Prof. Wei-Kuang Teng). Leading preparation of the technical stack for upcoming data-mining and distributed-ledger projects, and taking part in weekly lab seminars.",
    },
    {
        "years": "2024 – 2026",
        "role": "Graduate Consultant, Computational Energy Specialist",
        "org": "Arup, Taipei",
        "text": "Automated building-data analysis and performance-index calculations with Python, VBA, GIS and Excel. Built energy-consumption workflows from modelling (AutoCAD, Rhino, Grasshopper) through simulation (EnergyPlus, IES VE, OpenStudio, Ladybug, Honeybee) to analysis, and predicted LEED and EEWH scores for multidisciplinary project teams.",
    },
    {
        "years": "2024 – 2025",
        "role": "AI Trainer",
        "org": "Outlier, remote",
        "text": "Trained and refined multilingual large language models through reinforcement learning from human feedback (RLHF): wrote and optimised training data, evaluated model outputs to find weaknesses, and worked with engineers and researchers on new training approaches.",
    },
    {
        "years": "2021 – 2022",
        "role": "Research Assistant, Urban Planning",
        "org": "National Cheng Kung University, Tainan",
        "text": "Science-park site-selection research for Kaohsiung City Council: industry life cycles, supply chains, energy, markets and infrastructure, analysed with GIS and statistical methods across demographics, business models and traffic networks.",
    },
]

EDUCATION = [
    {
        "years": "2022 – 2023",
        "role": "MSc Urban Design and International Planning, Merit",
        "org": "The University of Manchester, UK",
        "text": "Global Future Scholarship. Distinction marks on two projects. Dissertation on mitigating urban heat islands through street retrofitting, with an automated UTCI simulation workflow and a decision-making toolkit.",
    },
    {
        "years": "2020 – 2023",
        "role": "MSc Urban Planning, Econometrics Lab",
        "org": "National Cheng Kung University, Taiwan",
        "text": "GPA 4.01. Thesis on senior housing decisions using logistic regression, supervised by Prof. Y. J. Chen. Third place, Student Research Award, 26th Forum on Land Use and Planning (2022).",
    },
    {
        "years": "2016 – 2020",
        "role": "Bachelor of Architecture",
        "org": "National University of Kaohsiung, Taiwan",
        "text": "GPA 3.5. Newcomer Award for Architecture and Interior Design Students, Architectural Institute of Kaohsiung (2018). Excellent Creativity Award, university hackathon (2017). Transnational Urban Design Workshop with FH Potsdam (2019).",
    },
]

TOOLKIT = [
    ("Languages", "Python, SQL, R, JavaScript (Google Earth Engine), VBA"),
    ("Data and machine learning", "pandas, NumPy, SciPy, scikit-learn, statsmodels, LightGBM, XGBoost, CatBoost, Plotly, Streamlit, SPSS"),
    ("Engineering", "Git, GitHub, Docker, web APIs, concurrency with thread pools, YAML-configured pipelines"),
    ("Geospatial", "ArcGIS Pro, ArcGIS Online, QGIS, Google Earth Engine, Sentinel-2 and Sentinel-5P"),
    ("Simulation and geometry", "EnergyPlus, OpenStudio, IES VE, Honeybee, Ladybug, Butterfly, OpenFOAM, LightStanza, Rhino, Grasshopper, Elefront, Revit, AutoCAD"),
    ("Methods", "Time-series feature engineering, anomaly detection, spatial autocorrelation, regression, logistic and discrete-choice models"),
]

CREDENTIALS = [
    ("Docker Foundations Professional Certificate", "Docker, via Coursera, 2026"),
    ("Emergency Medical Technician, Level 1", "Taiwan National Fire Agency, 2023"),
    ("Licentiate member", "Royal Town Planning Institute, since 2024 (student member 2022 – 2024)"),
    ("RTPI courses", "Town Planning and the UN SDGs; Planning to Protect Ancient Woodlands and Trees"),
    ("IPMA Level D Certificate", "International Project Management Association, 2021"),
]

SERVICE = [
    ("Student Ambassador", "The University of Manchester International Recruitment, 2022 – 2023"),
    ("Elderly care volunteer", "Kaohsiung Veterans Home and Chong Shang Day Care Center, 2018 – 2019"),
    ("Event volunteer", "25th Forum on Land Use and Planning; Tainan Sustainable Real Estate and Green Energy Forum, 2021"),
]
