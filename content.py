"""All site copy lives here. Edit this file, then run `python3 build.py`."""

SITE = {
    "name": "Ray Shi",
    "url": "https://ray-shi-dev.github.io",
    "role": "Building Physics Performance Engineer & Data Scientist",
    "description": "Ray Shi is a building physics performance engineer and data scientist working across energy simulation, spatial data and urban design.",
    "email": "ray.ecodesigner@gmail.com",
    "linkedin": "https://www.linkedin.com/in/ray-shi-b633302a8",
    "github": "https://github.com/Ray-Shi-Dev",
    "intro": "I'm a building physics engineer and data scientist trained in architecture and urban design. I model how buildings use energy, how streets hold heat, and how a city's form shapes where people live and work.",
    "now": [
        ("Role", "Building physics and data science"),
        ("Currently", "AI Trainer, Outlier (part-time)"),
        ("Previously", "Graduate Sustainability Consultant, Arup"),
    ],
}

GROUPS = [
    ("simulation", "Simulation and data", "Models and code that measure energy, air, water and economic activity."),
    ("design", "Urban design", "Masterplans and buildings, from a 430 m² block to a 22-hectare neighbourhood."),
]

PROJECTS = [
    {
        "slug": "arup-energy-climate-modelling",
        "tags": "EnergyPlus, LightStanza, OpenFOAM",
        "group": "simulation",
        "title": "Energy and climate modelling at Arup",
        "summary": "Energy, daylight, solar and airflow simulations that guide sustainable building design and LEED submissions.",
        "facts": [
            ("Location", "Taipei, Taiwan"),
            ("Context", "Arup, 2024 to 2026"),
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
        "group": "design",
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
        "I started in architecture, moved into urban planning and urban design, and now spend most of my time in simulation engines and code. The thread is the same throughout: measure how places perform, then design them to perform better for the people in them.",
        "From 2024 to 2026 I was a Graduate Sustainability Consultant at Arup in Taipei, building energy, daylight and airflow models for LEED, ASHRAE and EEWH projects. I also train large language models part-time for Outlier, and I write Python tools that carry methods between fields, from building-energy machine learning to finance.",
        "Away from the screen I read about neuroscience, psychology and financial engineering. I played left wing for my university football team.",
    ],
}

EXPERIENCE = [
    {
        "years": "2024 – 2026",
        "role": "Graduate Sustainability Consultant",
        "org": "Arup, Taipei",
        "text": "Building energy performance modelling and data analysis with Rhino, Grasshopper, EnergyPlus, Ladybug, Honeybee, OpenStudio and Python. Delivered LEED, ASHRAE 90.1/62.1 and EEWH work across energy, water and indoor air quality, and wrote project-specific sustainability guidelines with multidisciplinary teams.",
    },
    {
        "years": "2024 – now",
        "role": "AI Trainer",
        "org": "Outlier, remote, part-time",
        "text": "Train and refine multilingual large language models: build training data, evaluate model performance and work with AI engineers and researchers on new training methods.",
    },
    {
        "years": "2021 – 2022",
        "role": "Research Assistant",
        "org": "National Cheng Kung University, Tainan",
        "text": "Science park site-selection research for Kaohsiung City Council, covering industry life cycles, supply chains, energy, markets and infrastructure, with GIS and statistical analysis of demographics, business models and traffic networks.",
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
    ("Simulation and modelling", "EnergyPlus, OpenStudio, IES VE, Honeybee, Ladybug, Butterfly, OpenFOAM, LightStanza, Rhino, Grasshopper, Elefront, Revit, AutoCAD, SketchUp"),
    ("Data science", "Python, R, SQL, SPSS, Excel, Git, Docker"),
    ("Geospatial", "ArcGIS Pro, ArcGIS Online, QGIS, Google Earth Engine"),
    ("Standards", "LEED v4, ASHRAE 90.1 and 62.1, EEWH"),
    ("Visual communication", "InDesign, Illustrator, Photoshop"),
]

CREDENTIALS = [
    ("Docker Foundations Professional Certificate", "Docker, via Coursera, 2026"),
    ("Emergency Medical Technician, Level 1", "Taiwan National Fire Agency, 2023"),
    ("Licentiate member", "Royal Town Planning Institute, elected 2022"),
    ("RTPI courses", "Town Planning and the UN SDGs; Planning to Protect Ancient Woodlands and Trees"),
    ("IPMA Level D Certificate", "International Project Management Association, 2021"),
]

SERVICE = [
    ("Student Ambassador", "The University of Manchester International Recruitment, 2022 – 2023"),
    ("Elderly care volunteer", "Kaohsiung Veterans Home and Chong Shang Day Care Center, 2018 – 2019"),
    ("Event volunteer", "25th Forum on Land Use and Planning; Tainan Sustainable Real Estate and Green Energy Forum, 2021"),
]
