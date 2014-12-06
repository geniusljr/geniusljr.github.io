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

  var color = d3.scale.category20();
  var radius = d3.scale.sqrt()
      .domain([0, 100])
      .range([2, 20]);

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
    if (country == null) {
      console.log(location);
    }
    return country.toLowerCase();
  }

  var JOB_TYPES = ["Tiempo Completo", "Medio Tiempo", "Por Horas", "Temporal"];
  function getJobType(jobType) {
    var jobTypeArr = jobType.split(", ");
    return jobTypeArr;
  }

  function getSalary(salary) {
    salary = salary.replace(/[^\w\s]/g, '');
    if (salary.length == 0 || salary == "0") {
      return "unknown";
    }
    return salary.toLowerCase();
  }

  function getDateOrder(year, month) {
    return (year-110)*4+parseInt(month/3);//110 is 2010.
  }

  function getDateString(dateOrder) {
    var year = parseInt(dateOrder/4)+2010;
    var season = dateOrder%4;
    var startMonth = season*3+1;
    var str = "Year: " + year + " Month: " + startMonth + "-"+ (startMonth+2);
    return str;
  }
    
  $scope.displayTasks = [
    {name: "Task1"},
    {name: "Task2"},
    {name: "Task3"},
    {name: "Task4"}
  ];

  $scope.displayMethods = [
    {name: "Country"},
    {name: "Company"},
    {name: "JobType"},
    {name: "Salary"}
  ];

  $scope.displayCompanies = [
    {name: "Activos"},
    {name: "Adecco Argentina S.A."},
    {name: "Manpower"},
    {name: "SENSI s.r.l."},
    {name: "Guía Laboral SRL"},
    {name: "Activos S.A"},
    {name: "Grupo Gestión"},
    {name: "Iss Personal Temporario S.R.L."},
    {name: "Randstad"},
    {name: "Accionplus"},
  ];
  $scope.selectDisplayCompany = {};
  $scope.selectDisplayCompany.name = "Activos";

  $scope.displayCategories = [
    {
      name: 'commercial',
      key: ["vendedor", "ventas", "comercial", "vendedores", "contador", "compras", "vendedora, venta"]
    },
    {
      name: 'industrial', 
      key: ["programador", "técnico", "operario", "desarrollador", "ingeniero", "mantenimiento", "developer", "planta", "electrónico", "electromecánico", "industria", "electricista", "administrador"]
    },
    {
      name: 'residential',
      key: ["desarrolladores"]
    },
    {
      name: 'business',
      key: ["analista", "consultant", "consultor", "asesor", "marketing", "consultores", "depósito", "deposito"]
    },
    {
      name: 'services',
      key: ["chofer", "logística", "limpieza", "recepcionista"]
    }
  ];

  var query_field = {};
  for(var i=0; i<$scope.displayCategories.length; i++){
    var name = $scope.displayCategories[i].name;
    var query_string = $scope.displayCategories[i].key[0]+'~ or';
    for(var j=1; j<$scope.displayCategories[i].key.length; j++){
      query_string += ' '+($scope.displayCategories[i].key[j]+'~');
      if(j!=$scope.displayCategories[i].key.length-1){
        query_string += ' or';
      }
    }
    query_field[name] = query_string;
  }

  $scope.displayByTask = function(task) {
    svg.selectAll("circle").remove();
    d3.select("#sidebar").selectAll("g").remove();
    $("#datebar").empty();
    switch(task){
      case "Task1":
        return;
      case "Task2":
        this.companiesChangeOverTime();
        return;
      case "Task3":
        this.displayByMethod();
        return;
      case "Task4":
        this.categoriesOverTime();
        return;
    }
  }

  $scope.companiesChangeOverTime = function() {
    var points = new Array();
    var param = {
        'wt':'json',
        'q':'*:*', 
        'fq': 'company:\"' + $scope.selectDisplayCompany.name + '\"',
        'fl': 'latitude and longitude and postedDate',
        'rows': 2700
    };

    jQuery.ajax({
      'url': 'http://localhost:8983/solr/select/',
      'data': param,
      'dataType': 'jsonp',
      'jsonp': 'json.wrf',
      'success': function(responses) {
        var data = responses.response.docs;
        var dateFormat = d3.time.format("%Y-%m-%dT00:00:00Z");

        for (var i = 0; i < data.length; i++) {
          var point = [data[i].longitude, data[i].latitude];
          var date = dateFormat.parse(data[i].postedDate);
          data[i]['point'] = point;
          data[i]['colorBase'] = getDateOrder(date.getYear(), date.getMonth());
        }

        jQuery(document).ajaxComplete(function(){
              svg.selectAll("circle").remove();

              var circles = svg.selectAll("circle")
                            .data(data).enter()
                            .append("circle")
                            .attr("cx", function (d) { return projection(d.point)[0]; })
                            .attr("cy", function (d) { return projection(d.point)[1]; })
                            .attr("r", function (d) { return "15px"; })
                            .style("fill", function(d) { return color(d.colorBase); })
                            .style("fill-opacity", 0.6);

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

              var count = -1;
              setInterval(function(){
                count = (++count) % 15;
                svg.selectAll("circle")
                  .style('visibility','')
                  .filter(function(c){
                    return c.colorBase !== count; 
                  })
                  .style('visibility', "hidden");

                  $('#datebar').html(getDateString(count));
              }, 3000);
          }); // end of ajaxComplete
      }
    });

  }

  $scope.displayByMethod = function(){
    if($scope.taskID === 'Task3'){
      $scope.selectDisplayMethod = {
        name: 'Company'
      };
    }

    var points = new Array();
    var param = {
        'wt':'json',
        'q':'*:*', 
        'fl': 'latitude and longitude and company and salary and location2 and jobtype',
        'rows': 2700
    };

    jQuery.ajax({
      'url': 'http://localhost:8983/solr/select/',
      'data': param,
      'dataType': 'jsonp',
      'jsonp': 'json.wrf',
      'success': function(responses) { 
          var data = responses.response.docs;
          console.log(data.length);

          var categoryCount = [];

          for(var i = 0; i < data.length; i++){
              var point = [data[i].longitude, data[i].latitude];
              var colorBase = null;
              switch($scope.selectDisplayMethod.name) {
                case "Country":
                  colorBase = getCountryName(data[i].location2);
                  break;
                case "Company":
                  colorBase = data[i].company;
                  break;
                case "JobType":
                  colorBase = getJobType(data[i].jobtype);
                  break;
                case "Salary":
                  colorBase = getSalary(data[i].salary);
                  break;
              }
              data[i]['colorBase'] = colorBase;
              data[i]['point'] = point;
              if (colorBase == null) {
                continue;
              }
              if (colorBase in categoryCount) {
                categoryCount[colorBase] = categoryCount[colorBase]+1;
              } else {
                categoryCount[colorBase] = 1;
              }
          }

          for (var i = 0; i < data.length; i++) {
            if ($scope.selectDisplayMethod.name == "Company") {
              data[i]['size'] = radius(categoryCount[data[i].company]);
            } else {
              data[i]['size'] = "2px";
            }
          }


          jQuery(document).ajaxComplete(function(){
              svg.selectAll("circle").remove();
              d3.select("#sidebar").selectAll("g").remove();

              var circles = svg.selectAll("circle")
                            .data(data).enter()
                            .append("circle")
                            .attr("cx", function (d) { return projection(d.point)[0]; })
                            .attr("cy", function (d) { return projection(d.point)[1]; })
                            .attr("r", function (d) { return d.size; })
                            .attr("data-name", function(d) { return d.colorBase; })
                            .style("fill", function(d) { return color(d.colorBase); })
                            .style("fill-opacity", 1);

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

              var sortedCategoryCount = [];
              if ($scope.selectDisplayMethod.name == "JobType") {
                for (var i = 0; i < JOB_TYPES.length; i++) {
                  sortedCategoryCount.push([JOB_TYPES[i]]);
                }
              } else {
                for (var c in categoryCount) {
                  if (c != null)
                    sortedCategoryCount.push([c, categoryCount[c]]);
                }
                sortedCategoryCount.sort(function(a, b) {
                  return b[1] - a[1];
                });
              }
              
              sortedCategoryCount = sortedCategoryCount.slice(0, 10);
              console.log(sortedCategoryCount.length);
              
              var legend = d3.select("#sidebar").selectAll("svg")
                .data(sortedCategoryCount)
                .enter().append("g")
                .attr("class", "legend")
                .attr("transform", function(d, i){
                  return "translate(0," + i*20 +")";
                });

              legend.append('rect')
                .attr("width", 18)
                .attr("height", 18)
                .style("fill", function(d){
                    return color(d[0]);
                })
                .on('click', function(d){
                  svg.selectAll("circle")
                  .style('visibility','')
                  .style('fill', function(c){
                    return color(d[0]);
                  })
                  .filter(function(c){ 
                    if ($scope.selectDisplayMethod.name != "JobType") {
                      return d[0] != c.colorBase; 
                    } else {
                      return c.colorBase.indexOf(d[0]) == -1;
                    }
                  })
                  .style('visibility', "hidden");
                });

              legend.append('text')
                .attr("x", 40)
                .attr("y", 9)
                .attr("dy", ".35em")
                .text(function(d){
                    return d[0];
                });

          }); // end of ajaxComplete
      } // end of success

    });
  }

  $scope.categoriesChangeOverTime = function(){
    var points = new Array();
    var param = {
        'wt':'json',
        'q':'*:*', 
        'fq': query_field[$scope.selectDisplayCategory.name],
        'fl': 'latitude and longitude and postedDate and title',
        'rows': 2700
    };

    jQuery.ajax({
      'url': 'http://localhost:8983/solr/select/',
      'data': param,
      'dataType': 'jsonp',
      'jsonp': 'json.wrf',
      'success': function(responses) {
        var data = responses.response.docs;
        var dateFormat = d3.time.format("%Y-%m-%dT00:00:00Z");

        for (var i = 0; i < data.length; i++) {
          var point = [data[i].longitude, data[i].latitude];
          var date = dateFormat.parse(data[i].postedDate);
          data[i]['point'] = point;
          data[i]['colorBase'] = getDateOrder(date.getYear(), date.getMonth());
        }

        jQuery(document).ajaxComplete(function(){
              svg.selectAll("circle").remove();

              var circles = svg.selectAll("circle")
                            .data(data).enter()
                            .append("circle")
                            .attr("cx", function (d) { return projection(d.point)[0]; })
                            .attr("cy", function (d) { return projection(d.point)[1]; })
                            .attr("r", function (d) { return "15px"; })
                            .style("fill", function(d) { return color(d.colorBase); })
                            .style("fill-opacity", 0.6);

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

              var count = -1;
              var refreshIntervalId = setInterval(function(){
                count++;
                svg.selectAll("circle")
                  .style('visibility','')
                  .filter(function(c){
                    return c.colorBase !== count; 
                  })
                  .style('visibility', "hidden");
                  $('#datebar').html(getDateString(count));
              }, 3000);
              if(count > 15){
                 clearInterval(refreshIntervalId);
              }
          }); // end of ajaxComplete
      }
    });
  }
});