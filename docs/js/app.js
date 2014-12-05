var app = angular.module('myApp', ['d3']);

app.controller('MainCtrl', function($scope){

  var width = screen.width,
      height = screen.height;

  var quantize = d3.scale.quantize()
      .domain([0, 1000])
      .range(d3.range(9).map(function(i) { return "q" + i + "-9"; }));

  var projection = d3.geo.mercator()
      .translate([0, 0])
      .scale(1600);

  var path = d3.geo.path()
      .projection(projection);

  var svg = d3.select("body").append("svg")
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

  var g = svg.append("g");

  var color = d3.scale.category20b();
  var radius = d3.scale.sqrt()
      .domain([0, 100])
      .range([0, 5]);

  svg.append("rect")
      .attr("class", "overlay")
      .attr("x", -width / 2)
      .attr("y", -height / 2)
      .attr("width", width)
      .attr("height", height);

  d3.json('data/world-50m.json').get(function(err, world){
      g.append("path")
          .datum(topojson.feature(world, world.objects.countries))
          .attr("class", "land")
          .attr("d", path);

      g.append("path")
          .datum(topojson.mesh(world, world.objects.countries, function(a, b) { return a !== b; }))
          .attr("class", "boundary")
          .attr("d", path);
  });

  function getCountryName(location) {   
    location = jQuery.trim(location);
    if (location.length == 0) {
      return;
    }
    var locArr = location.split(", ");
    var country = locArr[locArr.length-1];

    //some special cases
    if (country.indexOf("-") != -1) {
      locArr = country.split("-");
      country = jQuery.trim(locArr[locArr.length-1]);
    }
    if (country == "Lago Buenos Aires") {
      country = "Argentina";
    }
    return country;
  }
    
  $scope.displayMethods = [
    {name: "Country"},
    {name: "Company"},
    {name: "JobType"},
    {name: "Salary"}
  ];




  $scope.displayByMethod = function(){
    var points = new Array();
    var param = {
        'wt':'json',
        'q':'*:*', 
        'fl': 'latitude and longitude and company and salary and location and jobtype',
        'rows': 27000
    };

    jQuery.ajax({
      'url': 'http://localhost:8983/solr/select/',
      'data': param,
      'dataType': 'jsonp',
      'jsonp': 'json.wrf',
      'success': function(responses) { 
          var data = responses.response.docs;

          var companyCount = [];

          for(var i=0; i<data.length; i++){
              var point = [data[i].longitude, data[i].latitude];
              var colorBase = null;
              switch($scope.selectDisplayMethod.name) {
                case "Country":
                  colorBase = getCountryName(data[i].location);
                  break;
                case "Company":
                  colorBase = data[i].company;
                  if (colorBase in companyCount) {
                    companyCount[colorBase] = companyCount[colorBase]+1;
                  } else {
                    companyCount[colorBase] = 1;
                  }
                  break;
                case "JobType":
                  colorBase = data[i].jobtype;
                  break;
                case "Salary":
                  colorBase = data[i].salary;
                  break;
              }
              data[i]['colorBase'] = colorBase;
              data[i]['point'] = point;
          }

          for (var i = 0; i < data.length; i++) {
            if ($scope.selectDisplayMethod.name == "Company") {
              data[i]['size'] = radius(companyCount[data[i].company]);
            } else {
              data[i]['size'] = "2px";
            }
          }

          console.log(companyCount);

          jQuery(document).ajaxComplete(function(){
              svg.selectAll("circle").remove();

              var circles = svg.selectAll("circle")
                            .data(data).enter()
                            .append("circle")
                            .attr("cx", function (d) { return projection(d.point)[0]; })
                            .attr("cy", function (d) { return projection(d.point)[1]; })
                            .attr("r", function (d) { return d.size; })
                            .style("fill", function(d) { return color(d.colorBase); })
                            .style("fill-opacity", 0.5);

              $('svg circle').tipsy({ 
                gravity: 'w', 
                html: true, 
                title: function() {
                  var d = this.__data__;
                  var tmp = "";
                  for(var key in d){
                      if (key === 'point'){
                        continue;
                      }
                      tmp += '<div style="text-align:left;">'+key+': <span style="color: yellow;">' + d[key] + '</span>';
                  }
                  return tmp;
                }
              });

          }); // end of ajaxComplete
      } // end of success

    });
  }
});