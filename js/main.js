/* JavaScript functions by Qianheng Zhang, 2024 */
window.onload = setMap();
var attrArray = ["Life_expectancy", "Adult_mortality",
"Infant_deaths","Alcohol_consumption",'BMI'];
var expressed = attrArray[0];

var chartWidth = window.innerWidth * 0.42,
    chartHeight = 530,
    leftPadding = 25,
    rightPadding = 2,
    topBottomPadding = 5,
    chartInnerWidth = chartWidth - leftPadding - rightPadding,
    chartInnerHeight = chartHeight - topBottomPadding * 2

var yScale = d3.scaleLinear()
    .range([0, 520])
    .domain([100, 0]);
function setMap(){

        //map frame dimensions
    var width = window.innerWidth * 0.5,
    height = 520;
    //create new svg container for the map
    var map = d3.select("body")
        .append("svg")
        .attr("class", "map")
        .attr("width", width)
        .attr("height", height);
    var mapTitle = map.append("text")
        .attr("x", 220)
        .attr("y", 30)
        .attr("class", "mapTitle")
        .text("Global Life Expectancy Map(Zoom and Pan allowed)");
    //create Albers equal area conic projection centered on France
    projection = d3.geoConicEqualArea()
        .parallels([0, 63.5])
        .rotate([-10, 0])
        .translate([width / 2, height / 2]);
    var path = d3.geoPath()
        .projection(projection);

    setGraticule(map, path);
    //use Promise.all to parallelize asynchronous data loading
    var promises = [d3.csv("data/LifeExpectency2015.csv"),
                    d3.json("data/world.topojson")
                    ];
        Promise.all(promises).then(callback);
        function callback(data){
            csvData = data[0];
            world = data[1];
            var worldCountries = topojson.feature(world, world.objects["world-administrative-boundaries"])
            var worldProperties = worldCountries.features;
            worldProperties = joinData(csvData, worldProperties);



            //add Europe countries to map
            var countries = map.append("path")
                .datum(worldCountries)
                .attr("class", "countries")
                .attr("d", path);
            colorScale = makeColorScale(csvData);
            setEnumerationUnits(worldProperties, map, path, colorScale);
            setChart(csvData, colorScale);
            createDropdown(csvData);
        };

    var zoom = d3.zoom()
        .scaleExtent([1, 8])
        .on('zoom', handleZoom);
    map.call(zoom);

};

function setGraticule(map, path) {
    var graticule = d3.geoGraticule()
    .step([20, 20]); //place graticule lines every 20 degrees of longitude and latitude

    //create graticule background
    var gratBackground = map.append("path")
        .datum(graticule.outline()) //bind graticule background
        .attr("class", "gratBackground") //assign class for styling
        .attr("d", path) //project graticule

    //Example 2.6 line 5...create graticule lines
    var gratLines = map.selectAll(".gratLines") //select graticule elements that will be created
        .data(graticule.lines()) //bind graticule lines to each element to be created
        .enter() //create an element for each datum
        .append("path") //append each element to the svg as a path element
        .attr("class", "gratLines") //assign class for styling
        .attr("d", path); //project graticule lines
}

function joinData(csvData, worldProperties) {
    for (var i=0; i<csvData.length; i++){
        var csvRegion = csvData[i]; //the current region
        var csvKey = csvRegion.name; //the CSV primary key
        // console.log(csvRegion);
        // console.log(csvKey);
        //loop through geojson regions to find correct region
        for (var a=0; a< worldProperties.length; a++){

            var geojsonProps = worldProperties[a].properties; //the current region geojson properties
            var geojsonKey = geojsonProps.name; //the geojson primary key
            // console.log(geojsonProps)
            // console.log(geojsonKey)
            //where primary keys match, transfer csv data to geojson properties object
            if (geojsonKey == csvKey){
                //console.log(1)
                //assign all attributes and values
                attrArray.forEach(function(attr){
                    // console.log(attr)
                    var val = parseFloat(csvRegion[attr]); //get csv attribute value
                    geojsonProps[attr] = val; //assign attribute and value to geojson properties
                });
            };
        };
    };

    for (var a=0; a< worldProperties.length; a++){
        worldProperties[a].properties.name = worldProperties[a].properties.name.split(' ').join('_');
    }
    return worldProperties;
}

function setEnumerationUnits(worldProperties, map, path, colorScale){
    var countries = map.selectAll(".countries")
        .data(worldProperties)
        .enter()
        .append("path")
        .attr("class", function(d){
            return "countries";
        })
        .attr("id", function(d){
            return "country_" + d.properties.name;
        })
        .attr("d", path)
            .style("fill", function(d){
                var value = d.properties[expressed];
                if(value) {
                    return colorScale(d.properties[expressed]);
                } else {
                    return "#ccc";
                }
        })
        .on("mouseover", function (event, d) {
            highlight(d.properties);
        })
        .on("mouseout", function (event, d) {
            dehighlight(d.properties);
        })
        .on("mousemove", moveLabel);
    var desc = countries.append("desc").text('{"stroke": "#000", "stroke-width": "0.5px"}');
};

function makeColorScale(data){
    var colorClasses = [
        "#edf8e9",
        "#bae4b3",
        "#74c476",
        "#31a354",
        "#006d2c"
    ];

    //create color scale generator
    var colorScale = d3.scaleQuantile()
        .range(colorClasses);

    //build two-value array of minimum and maximum expressed attribute values
    var minmax = [
        d3.min(data, function(d) { return parseFloat(d[expressed]); }),
        d3.max(data, function(d) { return parseFloat(d[expressed]); })
    ];
    //assign two-value array as scale domain
    colorScale.domain(minmax);

    return colorScale;
};

function setChart(csvData, colorScale){
    //chart frame dimensions
    var chartWidth = window.innerWidth * 0.42,
        chartHeight = 530,
        leftPadding = 25,
        rightPadding = 2,
        topBottomPadding = 5,
        chartInnerWidth = chartWidth - leftPadding - rightPadding,
        chartInnerHeight = chartHeight - topBottomPadding * 2,
        translate = "translate(" + leftPadding + "," + topBottomPadding + ")";

    //create a second svg element to hold the bar chart
    var chart = d3.select("body")
        .append("svg")
        .attr("width", chartWidth + 20)
        .attr("height", chartHeight)
        .attr("class", "chart");

    var chartBackground = chart.append("rect")
        .attr("class", "chartBackground")
        .attr("width", chartInnerWidth)
        .attr("height", chartInnerHeight)
        .attr("transform", translate);
    var yScale = d3.scaleLinear()
        .range([0, 520])
        .domain([100, 0]);

    //Example 2.4 line 8...set bars for each province
    var bars = chart.selectAll(".bars")
        .data(csvData)
        .enter()
        .append("rect")
        .sort(function(a, b){
            return b[expressed]-a[expressed]
        })
        .style("fill", function(d){
            return colorScale(d[expressed]);
        })
        .style('stroke', "#000")
        .style('stroke-width', "0.1px")
        .attr("class", function(d){
            return "bars";
        })
        .attr("id", function(d){
            //console.log(d)
            return "bars_" + d.name.split(' ').join('_');
        })
        .attr("width", (chartInnerWidth / csvData.length - 1))
        .attr("x", function(d, i){
            return i * (chartInnerWidth / csvData.length) + 27;
        })
        .attr("height", function(d){
            //console.log(d[expressed])

            result = chartInnerHeight - yScale(parseFloat(d[expressed]))
            //console.log(result)
            return result;
        })
        .attr("y", function(d){
            return yScale(parseFloat(d[expressed])) + 5;
        })
        .on("mouseover", function (event, d) {
            highlight(d);
        })
        .on("mouseout", function (event, d) {
            dehighlight(d);
        })
        .on("mousemove", moveLabel);

    var chartTitle = chart.append("text")
        .attr("x", 40)
        .attr("y", 40)
        .attr("class", "chartTitle")
        .text("The value of " + expressed + ' in each country');

    var yAxis = d3.axisLeft()
        .scale(yScale);

    //place axis
    var axis = chart.append("g")
        .attr("class", "axis")
        .attr("transform", translate)
        .call(yAxis);

    //create frame for chart border
    var chartFrame = chart.append("rect")
        .attr("class", "chartFrame")
        .attr("width", chartInnerWidth)
        .attr("height", chartInnerHeight)
        .attr("transform", translate);

    var desc = bars.append("desc").text('{"stroke": "#000", "stroke-width": "0.1px"}');

    updateChart(bars, csvData.length, colorScale);
};

function updateChart(bars, n, colorScale){
    //position bars
    bars.attr("x", function(d, i){
            return i * (chartInnerWidth / n) + leftPadding;
        })
        //size/resize bars
        .attr("height", function(d, i){
            return chartInnerHeight - yScale(parseFloat(d[expressed]))
        })
        .attr("y", function(d, i){
            return yScale(parseFloat(d[expressed])) + 5;
        })
        //color/recolor bars
        .style("fill", function(d){
            var value = d[expressed];
            if(value) {
                return colorScale(value);
            } else {
                return "#ccc";
            }
    });

};


function createDropdown(csvData){
    //add select element
    var dropdown = d3.select("body")
        .append("select")
        .attr("class", "dropdown")
        .on("change", function(){
            changeAttribute(this.value, csvData)
        });

    //add initial option
    var titleOption = dropdown.append("option")
        .attr("class", "titleOption")
        .attr("disabled", "true")
        .text("Select Attribute");

    //add attribute name options
    var attrOptions = dropdown.selectAll("attrOptions")
        .data(attrArray)
        .enter()
        .append("option")
        .attr("value", function(d){ return d })
        .text(function(d){ return d });
};

function changeAttribute(attribute, csvData){
    //console.log(csvData)
    //change the expressed attribute
    expressed = attribute;
    //recreate the color scale
    var colorScale = makeColorScale(csvData);

    //recolor enumeration units
    var countries = d3.selectAll(".countries")
        .transition()
        .duration(1000)
        .style("fill", function(d){
            var value = d.properties[expressed];
            if(value) {
                return colorScale(value);
            } else {
                return "#ccc";
            }
    });
    yScale = customizedYScale(csvData, expressed);
    yAxis = d3.axisLeft()
        .scale(yScale);
    d3.selectAll('g.axis')
            .call(yAxis)
    //Sort, resize, and recolor bars
    var bars = d3.selectAll(".bars")
        //Sort bars
        .sort(function(a, b){
            return b[expressed] - a[expressed];
        })
        .transition() //add animation
        .delay(function(d, i){
            return i * 5
        })
        .duration(500)
        .attr("x", function(d, i){
            return i * (chartInnerWidth / csvData.length) + leftPadding;
        })
        //resize bars
        .attr("height", function(d, i){
            return 463 - yScale(parseFloat(d[expressed]));
        })
        .attr("y", function(d, i){
            return yScale(parseFloat(d[expressed])) + topBottomPadding;
        })
        //recolor bars
        .style("fill", function(d){
            var value = d[expressed];
            if(value) {
                return colorScale(value);
            } else {
                return "#ccc";
            }
    });

    var chartTitle = d3.selectAll(".chartTitle")
        .text("The value of " + expressed + ' in each country');
    updateChart(bars, csvData.length, colorScale);
};


//function to highlight enumeration units and bars
function highlight(props) {
    //change stroke

    //console.log(props)
    var item = d3.selectAll('#country_China')
    var selected = d3
        .selectAll("#country_" + props.name)
        .style("stroke", "blue")
        .style("stroke-width", "2");
    var selectedBar = d3
        .selectAll("#bars_" + props.name)
        .style("stroke", "blue")
        .style("stroke-width", "2");
    setLabel(props);
}


//function to reset the element style on mouseout
function dehighlight(props) {
    var selected = d3
        .select("#country_" +  props.name)
        .style("stroke", function () {
            return getStyle(this, "stroke");
        })
        .style("stroke-width", function () {
            return getStyle(this, "stroke-width");
        });
    var selectedBar = d3
        .selectAll("#bars_" + props.name)
        .style("stroke", function () {
            return getStyle(this, "stroke");
        })
        .style("stroke-width", function () {
            return getStyle(this, "stroke-width");
        });
    function getStyle(element, styleName) {
        var styleText = d3.select(element).select("desc").text();

        var styleObject = JSON.parse(styleText);

        return styleObject[styleName];
    }
    //remove info label
    d3.select(".infolabel").remove();
}

//function to create dynamic label
function setLabel(props) {
    console.log("here!");
    //label content
    var labelAttribute = "<h3>" + expressed + ": </h3><b>" + props[expressed]  + "</b>";

    //create info label div
    var infolabel = d3
        .select("body")
        .append("div")
        .attr("class", "infolabel")
        .attr("id", props.name + "_label")
        .html(labelAttribute);

    var regionName = infolabel.append("div").attr("class", "labelname").html(props.name);
}

//function to move info label with mouse
function moveLabel() {
    //use coordinates of mousemove event to set label coordinates
    var x = event.clientX + 10,
        y = event.clientY - 75;

    d3.select(".infolabel")
        .style("left", x + "px")
        .style("top", y + "px");
}

//handles different scales for different data range
function customizedYScale(csvData, expressed) {
    var array = [];
    for (i = 0; i <csvData.length; i++){
        array.push(parseFloat(csvData[i][expressed]));
    }
    var rangeMax = Math.max(...array)
    if (rangeMax < 20) {
        var domain = [20, 0]
    } else if ((rangeMax < 100)) {
        var domain = [100, 0]
    } else {
        var domain = [800, 0]
    }
    var scale = d3.scaleLinear()
        .range([0, 520])
        .domain(domain);
    return scale;
}

// add zoom function to the map
function handleZoom(e) {
    d3.selectAll('path')
        .attr('transform', e.transform);
}