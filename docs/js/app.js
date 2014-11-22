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

  var countries = new Array();
  var salaries = new Array();
  //méxico, Perú
  var COUNTRY = ['argentina','colombia','dominican','honduras','xico','per','venezuela',''];
  // find all company
  // http://localhost:8983/solr/collection1/select?q=*:*&wt=json&facet=true&facet.field=company
  $scope.companies = [
    {name: 'Adecco Argentina S.A.'},
    {name: 'SENSI s.r.l.'},
    {name: 'Guía Laboral SRL'},
    {name: 'Grupo Gestión'}
  ];
  $scope.selectCompany = "";


  $scope.searchForCompany = function(){
    var points = new Array();
    var param = {
        'wt':'json',
        'q':'*:*', 
        'fq': 'company:'+$scope.selectCompany.name,
        'fl': 'latitude and longitude and company and salary',
        'rows': 700
    };

    jQuery.ajax({
      'url': 'http://localhost:8983/solr/select/',
      'data': param,
      'success': function(responses) { 
          var data = responses.response.docs;
          for(var i=0; i<data.length; i++){
              var point = [data[i].longitude, data[i].latitude];
              data[i]['point'] = point;
          }

          svg.selectAll("circle").remove();
          var circles = svg.selectAll("circle")
                  .data(data).enter()
                  .append("circle")
                  .attr("cx", function (d) { return projection(d.point)[0]; })
                  .attr("cy", function (d) { return projection(d.point)[1]; })
                  .attr("r", "3px")
                  .attr("class", 'q5-9');

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
                  tmp += '<div>'+key+': <span style="color: yellow">' + d[key] + '</span>';
              }
              return tmp;
            }
          });
      },
      'dataType': 'jsonp',
      'jsonp': 'json.wrf'
    });
  }
});