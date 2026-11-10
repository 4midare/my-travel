// 실시간 날씨 — Open-Meteo (API 키 불필요)
  (function () {
    var el = document.getElementById("weather");
    var LAT = parseFloat(el.getAttribute("data-lat")), LON = parseFloat(el.getAttribute("data-lon"));
    var TZ = encodeURIComponent(el.getAttribute("data-tz") || "auto");
    var url = "https://api.open-meteo.com/v1/forecast"
      + "?latitude=" + LAT + "&longitude=" + LON
      + "&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,apparent_temperature,is_day"
      + "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max"
      + "&wind_speed_unit=ms&forecast_days=7&timezone=" + TZ + "";

    // WMO 날씨 코드 → [낮 이모지, 밤 이모지, 한국어 설명]
    var WMO = {
      0:["☀️","🌙","맑음"],
      1:["🌤️","🌙","대체로 맑음"],
      2:["⛅","☁️","구름 조금"],
      3:["☁️","☁️","흐림"],
      45:["🌫️","🌫️","안개"], 48:["🌫️","🌫️","짙은 안개"],
      51:["🌦️","🌧️","약한 이슬비"], 53:["🌦️","🌧️","이슬비"], 55:["🌧️","🌧️","강한 이슬비"],
      56:["🌧️","🌧️","어는 이슬비"], 57:["🌧️","🌧️","강한 어는 이슬비"],
      61:["🌦️","🌧️","약한 비"], 63:["🌧️","🌧️","비"], 65:["🌧️","🌧️","강한 비"],
      66:["🌧️","🌧️","어는 비"], 67:["🌧️","🌧️","강한 어는 비"],
      71:["🌨️","🌨️","약한 눈"], 73:["🌨️","🌨️","눈"], 75:["❄️","❄️","강한 눈"],
      77:["🌨️","🌨️","싸락눈"],
      80:["🌦️","🌧️","약한 소나기"], 81:["🌧️","🌧️","소나기"], 82:["⛈️","⛈️","강한 소나기"],
      85:["🌨️","🌨️","약한 눈 소나기"], 86:["❄️","❄️","강한 눈 소나기"],
      95:["⛈️","⛈️","뇌우"], 96:["⛈️","⛈️","뇌우(우박)"], 99:["⛈️","⛈️","강한 뇌우(우박)"]
    };

    function $(id){ return document.getElementById(id); }

    fetch(url)
      .then(function (r) { if(!r.ok) throw new Error("HTTP "+r.status); return r.json(); })
      .then(function (data) {
        var c = data.current;
        var info = WMO[c.weather_code] || ["🌡️","🌡️","날씨 정보"];
        var isDay = c.is_day === 1;
        $("wxIcon").textContent = isDay ? info[0] : info[1];
        $("wxTemp").textContent = Math.round(c.temperature_2m) + "°";
        $("wxCond").textContent = info[2];
        $("wxFeels").textContent = Math.round(c.apparent_temperature) + "°";
        $("wxHum").textContent = c.relative_humidity_2m + "%";
        $("wxWind").textContent = c.wind_speed_10m.toFixed(1) + " m/s";
        $("wxStats").style.display = "flex";
        var t = c.time.replace("T", " ");
        $("wxFoot").textContent = "현재 " + t + " (현지) · Open-Meteo";

        // 주간 예보 (7일)
        var d = data.daily;
        if (d && d.time) {
          var DOW = ["일","월","화","수","목","금","토"];
          var html = "";
          for (var i = 0; i < d.time.length; i++) {
            var dt = new Date(d.time[i] + "T00:00:00");
            var info = WMO[d.weather_code[i]] || ["🌡️","🌡️","-"];
            var dowKr = DOW[dt.getDay()];
            var isWeekend = dt.getDay() === 0 || dt.getDay() === 6;
            var label = (i === 0) ? "오늘" : (dowKr + ".");
            var pop = d.precipitation_probability_max[i];
            html += '<div class="wx-day' + (isWeekend ? " wknd" : "") + '">'
              + '<div class="wd-name">' + label + '</div>'
              + '<div class="wd-date">' + (dt.getMonth()+1) + "/" + dt.getDate() + '</div>'
              + '<div class="wd-icon">' + info[0] + '</div>'
              + '<div class="wd-pop">' + (pop != null ? "💧" + pop + "%" : "") + '</div>'
              + '<div class="wd-temp"><b>' + Math.round(d.temperature_2m_max[i]) + '°</b>'
              + '<span>' + Math.round(d.temperature_2m_min[i]) + '°</span></div>'
              + '</div>';
          }
          var wk = $("wxWeek");
          wk.innerHTML = html;
          wk.style.display = "flex";
        }
      })
      .catch(function () {
        var w = $("weather");
        w.className = "weather wx-error";
        w.innerHTML = "⚠️ 날씨 정보를 불러오지 못했어요. 네트워크 상태를 확인해 주세요.";
      });
  })();
