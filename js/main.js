/* JavaScript functions by Qianheng Zhang, 2024 */
window.onload = setMap();
var attrArray = ["Life_expectancy", "Adult_mortality",
"Infant_deaths","Alcohol_consumption"];
var expressed = attrArray[0]; //initial attribute
//execute script when window is loaded
function setMap(){

        //map frame dimensions
    var width = window.innerWidth * 0.5,
    height = 720;
    //create new svg container for the map
    var map = d3.select("body")
        .append("svg")
        .attr("class", "map")
        .attr("width", width)
        .attr("height", height);
    var mapTitle = map.append("text")
        .attr("x", 30)
        .attr("y", 40)
        .attr("class", "mapTitle")
        .text("Global Life Expectancy Map");
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
        };



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
        var csvKey = csvRegion.Country; //the CSV primary key
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
                 console.log(1)
                //assign all attributes and values
                attrArray.forEach(function(attr){
                    // console.log(attr)
                    var val = parseFloat(csvRegion[attr]); //get csv attribute value
                    geojsonProps[attr] = val; //assign attribute and value to geojson properties
                });
            };
        };
    };
    return worldProperties;
}

function setEnumerationUnits(worldProperties, map, path, colorScale){
    //add France regions to map
    var countries = map.selectAll(".countries")
        .data(worldProperties)
        .enter()
        .append("path")
        .attr("class", function(d){
            return "Country: " + d.properties.name;
        })
        .attr("d", path)
            .style("fill", function(d){
                var value = d.properties[expressed];
                if(value) {
                    return colorScale(d.properties[expressed]);
                } else {
                    return "#ccc";
                }
        });
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
        chartHeight = 730,
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
        .range([0, 720])
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
        .style('stroke', "#b3afafe5")
        .style('stroke-width', "0.1px")
        .attr("class", function(d){
            return "bars";
        })
        .attr("id", function(d){
            return "bars_" + d.Country;
        })
        .attr("width", (chartInnerWidth / csvData.length - 1))
        .attr("x", function(d, i){
            return i * (chartInnerWidth / csvData.length) + 27;
        })
        .attr("height", function(d){
            console.log(d[expressed])

            result = chartInnerHeight - yScale(parseFloat(d[expressed]))
            console.log(result)
            return result;
        })
        .attr("y", function(d){
            return yScale(parseFloat(d[expressed])) + 5;
        });

    var chartTitle = chart.append("text")
        .attr("x", 40)
        .attr("y", 40)
        .attr("class", "chartTitle")
        .text("The value of " + expressed);

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
};