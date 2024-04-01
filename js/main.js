/* JavaScript functions by Qianheng Zhang, 2024 */
window.onload = setMap();

//execute script when window is loaded
function setMap(){

        //map frame dimensions
    var width = window.innerWidth,
        height = window.innerHeight;

    //create new svg container for the map
    var map = d3.select("body")
        .append("svg")
        .attr("class", "map")
        .attr("width", width)
        .attr("height", height);

    //create Albers equal area conic projection centered on France
    var projection = d3.geoMercator()
        .center([5, 30])
        .rotate([0, 0])
        .scale(200)
        .translate([width / 2, height / 2]);
    var path = d3.geoPath()
        .projection(projection);
    //use Promise.all to parallelize asynchronous data loading
    var promises = [d3.csv("data/LifeExpectency2015.csv"),
                    d3.json("data/world.topojson")
                    ];
        Promise.all(promises).then(callback);

        function callback(data){
            csvData = data[0];
            world = data[1];
            var worldCountries = topojson.feature(world, world.objects["world-administrative-boundaries"])
            console.log(worldCountries)
            //add Europe countries to map
            var countries = map.append("path")
                .datum(worldCountries)
                .attr("class", "countries")
                .attr("d", path);
        };

    var graticule = d3.geoGraticule()
        .step([20, 20]); //place graticule lines every 5 degrees of longitude and latitude

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
};
