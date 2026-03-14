// --- Clock and Date Widget ---
function updateTime() {
    const now = new Date();
    document.getElementById('liveClock').textContent = now.toLocaleTimeString('ar-EG', { hour12: false });
    document.getElementById('liveDate').textContent = now.toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' });
}
setInterval(updateTime, 1000);
updateTime();

// --- Navigation & View Switching ---
const navItems = document.querySelectorAll('.nav-item');
const viewLayers = document.querySelectorAll('.view-layer');
const localLayersControl = document.getElementById('localLayers');
const currentViewTitle = document.getElementById('currentViewTitle');

const titles = {
    'world-monitor': 'المرصد العالمي - متصل',
    'flightradar': 'Flightradar24 - حركة الطيران الحية',
    'marinetraffic': 'Marine Traffic - حركة الملاحة البحرية',
    'liveuamap': 'Liveuamap - خريطة الأحداث الحية',
    'warstrikes': 'War Strikes - الغارات والصراعات',
    'mts': 'MTS System - التتبع البحري واللوجستي'
};

navItems.forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        
        // Remove active class from all nav items
        navItems.forEach(nav => nav.classList.remove('active'));
        // Add active class to clicked item
        item.classList.add('active');
        
        const targetId = item.getAttribute('data-target');
        
        // Hide all layers
        viewLayers.forEach(layer => layer.classList.remove('active'));
        // Show target layer
        document.getElementById(`view-${targetId}`).classList.add('active');
        
        // Update Title
        currentViewTitle.textContent = titles[targetId];

        // Toggle Local Map Layers Control Visibility
        if (targetId === 'world-monitor') {
            localLayersControl.style.opacity = '1';
            localLayersControl.style.pointerEvents = 'auto';
            localLayersControl.style.height = 'auto';
            setTimeout(() => { map.invalidateSize(); }, 300); // Fix map render issue when resizing/unhiding
        } else {
            localLayersControl.style.opacity = '0.5';
            localLayersControl.style.pointerEvents = 'none';
        }
    });
});

// --- Live TV Switching ---
const tvTabs = document.querySelectorAll('.tv-tab');
const tvIframe = document.getElementById('tvIframe');

// Note: Official channels change their live stream URLs frequently. 
// These use the channel ID method to always get the current live stream.
const tvChannels = {
    'jazeera': 'https://www.youtube.com/embed/live_stream?channel=UCfiwzLy-8yKzIbsmZTzxDgw&autoplay=1&mute=1', // Al Jazeera
    'hadath': 'https://www.youtube.com/embed/live_stream?channel=UCpjiw0k1R_DjcD8R4KqfPDA&autoplay=1&mute=1' // Al Hadath
};

tvTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        tvTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const channel = tab.getAttribute('data-channel');
        tvIframe.src = tvChannels[channel];
    });
});

// --- Leaflet Map Logic (World Monitor) ---

const map = L.map('map', {
    center: [30.0, 38.0], // Center on Middle East
    zoom: 4,
    zoomControl: false,
    attributionControl: false // Cleaner UI
});

L.control.zoom({ position: 'bottomleft' }).addTo(map);

// Use a darker base map for futuristic aesthetic
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 19
}).addTo(map);

// --- Dummy Data ---
const database = {
    conflicts: [
        { lat: 31.5, lon: 34.46, title: "قطاع غزة", desc: "استمرار العمليات العسكرية والقصف الجوي المكثف.", severity: "high" },
        { lat: 33.88, lon: 35.5, title: "جنوب لبنان", desc: "تبادل إطلاق النيران عبر الحدود واستهداف مواقع.", severity: "high" },
        { lat: 15.5, lon: 32.5, title: "السودان", desc: "اشتباكات مستمرة.", severity: "high" },
        { lat: 48.37, lon: 31.16, title: "أوكرانيا", desc: "هجمات بطائرات مسيرة وصواريخ.", severity: "high" }
    ],
    bases: [
        { lat: 25.11, lon: 51.31, title: "قاعدة العديد", desc: "أكبر قاعدة جوية أمريكية في الشرق الأوسط (قطر).", country: "قطر" },
        { lat: 26.22, lon: 50.58, title: "مقر الأسطول الخامس", desc: "القاعدة الرئيسية للبحرية الأمريكية في المنطقة (البحرين)." }
    ],
    hotspots: [
        { lat: 24.0, lon: 119.0, title: "مضيق تايوان", desc: "حشود عسكرية ومناورات." },
        { lat: 12.5, lon: 43.3, title: "باب المندب", desc: "توترات بحرية واستهداف سفن." }
    ],
    nuclear: [
        { lat: 33.72, lon: 51.72, title: "منشأة نطنز", desc: "تخصيب اليورانيوم (إيران)." },
        { lat: 47.5, lon: 34.5, title: "زاپاروجيا", desc: "محطة نووية تحت السيطرة (أوكرانيا)." }
    ]
};

const layers = {};
Object.keys(database).forEach(key => { layers[key] = L.layerGroup(); });

function getLayerConfig(key) {
    const config = {
        conflicts: { color: '#ff3b30', icon: 'fa-bomb', pulse: true, label: 'صراع / حرب' },
        bases: { color: '#00f3ff', icon: 'fa-building-shield', pulse: false, label: 'قاعدة عسكرية' },
        hotspots: { color: '#ff9500', icon: 'fa-fire', pulse: true, customClass: 'radar-ping', label: 'بؤرة توتر' },
        nuclear: { color: '#ffd60a', icon: 'fa-radiation', pulse: false, label: 'منشأة نووية' }
    };
    return config[key] || { color: '#ffffff', icon: 'fa-map-marker', pulse: false, label: 'موقع' };
}

Object.keys(database).forEach(category => {
    const dataList = database[category];
    const config = getLayerConfig(category);
    
    dataList.forEach(item => {
        let htmlContent = `<div class="custom-marker ${config.pulse && category !== 'hotspots' ? 'marker-pulse' : ''}" style="background-color: ${config.color}; width: 28px; height: 28px; box-shadow: 0 0 10px ${config.color}">
                               <i class="fas ${config.icon}"></i>
                           </div>`;
                           
        if (category === 'hotspots') {
            htmlContent = `<div class="radar-ping" style="background-color: ${config.color}; box-shadow: 0 0 15px ${config.color}"></div>`;
        }

        const customIcon = L.divIcon({
            html: htmlContent,
            className: 'div-icon-wrapper',
            iconSize: [28, 28],
            iconAnchor: [14, 14],
            popupAnchor: [0, -14]
        });

        const marker = L.marker([item.lat, item.lon], { icon: customIcon });
        
        marker.bindPopup(`
            <div class="popup-title"><i class="fas ${config.icon}" style="color:${config.color}; margin-left:5px;"></i> ${item.title}</div>
            <div class="popup-desc">${item.desc}</div>
        `);

        marker.on('click', () => { showInfoPanel(item, config); });
        marker.addTo(layers[category]);
    });
});

// Info Panel Logic
const infoPanel = document.getElementById('infoPanel');
const infoContent = document.getElementById('infoContent');
const closeInfoBtn = document.getElementById('closeInfoPanel');

function showInfoPanel(item, config) {
    const today = new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
    
    infoContent.innerHTML = `
        <div class="info-header">
            <div class="info-category"><i class="fas ${config.icon}" style="color:${config.color}"></i> <span style="color:${config.color}; text-shadow: 0 0 5px ${config.color}55">${config.label}</span></div>
            <div class="info-title">${item.title}</div>
            <div class="info-date"><i class="far fa-clock"></i> تحديث مباشر</div>
        </div>
        <div class="info-body">
            <p>${item.desc}</p>
            ${item.country ? `<p style="margin-top:10px; color:#fff;"><strong>الدولة:</strong> ${item.country}</p>` : ''}
            <div class="info-meta">
                <div class="meta-item"><i class="fas fa-satellite"></i> إحداثيات النطاق: ${item.lat.toFixed(2)}, ${item.lon.toFixed(2)}</div>
            </div>
        </div>
    `;
    infoPanel.classList.add('active');
}

closeInfoBtn.addEventListener('click', () => { infoPanel.classList.remove('active'); });
map.on('click', () => { infoPanel.classList.remove('active'); });

// Toggle Layers
const checkboxes = document.querySelectorAll('.layer-toggle input');
function syncLayers() {
    checkboxes.forEach(checkbox => {
        const val = checkbox.value;
        if (checkbox.checked && layers[val] && !map.hasLayer(layers[val])) map.addLayer(layers[val]);
        else if (!checkbox.checked && layers[val] && map.hasLayer(layers[val])) map.removeLayer(layers[val]);
    });
}
syncLayers(); // Init
checkboxes.forEach(checkbox => checkbox.addEventListener('change', syncLayers));

