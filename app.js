// 1. Инициализация на картата, центрирана над географския център на България
const map = L.map('map').setView([42.7339, 25.4858], 7.5);

// Добавяне на базова карта (светъл и изчистен дизайн от CartoDB)
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors | Данни: <a href="https://data.egov.bg/organisation/dataset/b56288b6-25aa-4049-9aa6-de2cd4cdabf8" target="_blank">Портал за отворени данни</a>'
}).addTo(map);

let geojsonLayer;
let examData = {}; // Глобална променлива за заредените от матурите данни

// 2. Цветова скала спрямо средния брой точки (0 - 100 точки)
function getColor(score) {
    if (score === null || score === undefined || score === 0) return '#e0e0e0'; // Няма данни
    return score > 80 ? '#1b1464' : // Изключителни резултати (Тъмно синьо)
           score > 65 ? '#0652dd' : // Отлични резултати (Синьо)
           score > 50 ? '#ffc312' : // Добри резултати (Жълто)
           score > 35 ? '#f79f1f' : // Средни резултати (Оранжево)
                        '#ea2027';  // Слаби резултати (Червено)
}

// 3. Функция, която дефинира визията на всяка община
function styleFeature(feature) {
    // Вземаме името на общината от GeoJSON и го правим с ГЛАВНИ БУКВИ,
    // за да пасне точно с ключовете във вашия data.json (напр. "АВРЕН")
    let munNameKey = feature.properties.name.toUpperCase().trim();
    
    // Поправка за карти, където името е записано като "ОБЩИНА АВРЕН" вместо само "АВРЕН"
    if (munNameKey.startsWith("ОБЩИНА ")) {
        munNameKey = munNameKey.replace("ОБЩИНА ", "").trim();
    }

    // Премахваме " ОБЩИНА", ако името завършва така (напр. "СТОЛИЧНА ОБЩИНА" -> "СТОЛИЧНА")
    if (munNameKey.endsWith(" ОБЩИНА")) {
        munNameKey = munNameKey.replace(" ОБЩИНА", "").trim();
    }

    const selectedYear = document.getElementById('yearSelect').value;
    const currentSubject = document.getElementById('subjectSelect').value;

    const yearData = examData[selectedYear];
    const munData = yearData ? yearData[munNameKey] : null;
    const score = munData ? munData[currentSubject] : null;

    return {
        fillColor: getColor(score),
        weight: 1.2,
        opacity: 1,
        color: '#ffffff', // Бял цвят за границите между общините
        fillOpacity: 0.75
    };
}

// 4. Логика за интеракция (Посочване с мишката / Клик)
function onEachFeature(feature, layer) {
    layer.on({
        mouseover: function(e) {
            const currentLayer = e.target;
            currentLayer.setStyle({
                fillOpacity: 0.95,
                weight: 2.5,
                color: '#2c3e50'
            });
            currentLayer.bringToFront();

            // Извличане на данни
            const munNameGeo = feature.properties.name; // Оригинално име за показване
            let munNameKey = munNameGeo.toUpperCase().trim();
            if (munNameKey.startsWith("ОБЩИНА ")) {
                munNameKey = munNameKey.replace("ОБЩИНА ", "").trim();
            }

            const selectedYear = document.getElementById('yearSelect').value;
            const currentSubject = document.getElementById('subjectSelect').value;
            
            const yearData = examData[selectedYear];
            const munData = yearData ? yearData[munNameKey] : null;
            
            let detailsHtml = '';
            
            if (munData) {
                // Избираме броя явили се спрямо това кой предмет гледаме в момента
                //const studentsCount = (currentSubject === 'bel_score') ? munData.students_bel : munData.students_math;
                
                if (currentSubject === 'bel_score') {

                    detailsHtml = `
                        <h3>общ. ${munNameGeo}</h3>
                        <p><b>Учебна година:</b> ${selectedYear}</p>
                        <p><b>Средни точки БЕЛ:</b> <span style="color:#0652dd; font-weight:bold;">${munData.bel_score} т.</span></p>
                        <p><b>Явили се ученици на БЕЛ:</b> ${munData.students_bel}</p>
                    `;
                } else if (currentSubject === 'mat_score') {

                    detailsHtml = `
                        <h3>общ. ${munNameGeo}</h3>
                        <p><b>Учебна година:</b> ${selectedYear}</p>
                        <p><b>Средни точки Математика:</b> <span style="color:#ea2027; font-weight:bold;">${munData.mat_score} т.</span></p>
                        <p><b>Явили се ученици на Математика:</b> ${munData.students_math}</p>
                    `;
                }
            } else {
                detailsHtml = `
                    <h3>общ. ${munNameGeo}</h3>
                    <p><b>Учебна година:</b> ${selectedYear}</p>
                    <p style="color:#7f8c8d;">Няма налични данни за тази община в криптирания масив.</p>
                `;
            }
            
            document.getElementById('detailsBox').innerHTML = detailsHtml;
        },
        mouseout: function(e) {
            geojsonLayer.resetStyle(e.target);
        }
    });
}

// 5. Основна функция за зареждане на външните файлове
async function initDashboard() {
    try {
        // Асинхронно зареждане на вашите матури от data.json
        const dataResponse = await fetch('data.json');
        examData = await dataResponse.json();

        // Асинхронно зареждане на границите на общините от bg-municipalities.json
        const geoResponse = await fetch('bg-municipalities.json');
        const geoData = await geoResponse.json();

        // Визуализиране на GeoJSON слоя върху картата
        //geojsonLayer = L.geoJSON(geoData, {
        //   style: styleFeature,
        //    onEachFeature: onEachFeature
        //}).addTo(map);

        geojsonLayer = L.geoJSON(geoData, {
            // ФИЛТЪР: Казваме на Leaflet да пропуска точките (Пиновете) и да рисува САМО полигоните
            filter: function(feature) {
                // Рисува обекта само ако НЕ Е точка (т.е. е Polygon или MultiPolygon)
                return feature.geometry.type !== "Point"; 
            },
            style: styleFeature,
            onEachFeature: onEachFeature
        }).addTo(map);


 
   

        // Автоматично добавяне на легенда на екрана
        createLegend();

    } catch (err) {
        console.error("Грешка при инициализация на дашборда:", err);
        document.getElementById('detailsBox').innerHTML = `
            <h3 style="color:#ea2027;">Грешка при зареждане</h3>
            <p>Неуспешно извличане на данните от JSON файловете. Уверете се, че файловете 'data.json' и 'bg-municipalities.json' са в същата папка.</p>
        `;
    }
}

// 6. Функция за обновяване при промяна на филтрите (Година или Предмет)
function updateDashboard() {
    if (geojsonLayer) {
        geojsonLayer.setStyle(styleFeature);
    }
}

// 7. Създаване на динамична Легенда в долния десен ъгъл
function createLegend() {
    const legend = L.control({ position: 'bottomright' });
    
    legend.onAdd = function () {
        const div = L.DomUtil.create('div', 'info legend');
        
        // Масив с долните граници за всяка категория точки
        const grades = [0, 35, 50, 65, 80];
        
        // Масив с точните текстови описания, съответстващи на нивата
        const labels = [
            'Под 35 т.',
            '35 &ndash; 50 т.',
            '50 &ndash; 65 т.',
            '65 &ndash; 80 т.',
            'Над 80 т.'
        ];

        div.innerHTML += '<h4>Среден успех (точки)</h4>';
        
        // 1. Първо добавяме ръчно реда за нула точки (липсващи данни)
        div.innerHTML += `<i style="background:${getColor(0)}"></i> Няма налични данни<br>`;
        
        // 2. Въртим чист цикъл по всички налични категории в масива
        for (let i = 0; i < grades.length; i++) {
            // Подаваме малко по-висока стойност от долната граница (+1), 
            // за да може getColor() да хване правилния цвят за този диапазон
            const currentLayerColor = getColor(grades[i] + 1);
            
            div.innerHTML += `<i style="background:${currentLayerColor}"></i> ${labels[i]}<br>`;
        }
        
        return div;
    };
    
    legend.addTo(map);
}

// Стартиране при първоначално отваряне на страницата
initDashboard();