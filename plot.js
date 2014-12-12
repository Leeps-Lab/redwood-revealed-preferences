Redwood.directive("rpPlot", function ($compile) {
    return {
        restrict: "A",
        scope: {
            budgetFunc: "=",
            inverseBudgetFunc: "=",
            endowment: "=",
            selection: "=",
            limits: "=",
            inputEnabled: "=",
            result: "=",
            width: "=",
            height: "=",
         },
         template: '<svg width="{{width}}" height="{{height}}"></svg>',
         link: function ($scope, $elem, attr) {

            var svg = d3.select($elem[0]).select("svg");

            var xOffset = 30;
            var yOffset = 30;
            var plotWidth = $scope.width - xOffset;
            var plotHeight = $scope.height - yOffset;

            var plot = svg.append("g")
                .attr("transform", "translate(" + xOffset + ", 0)");

            plot.append("rect")
                .attr("fill", "#dddddd")
                .attr("width", plotWidth)
                .attr("height", plotHeight);

            var xScale, yScale;
            var buildScales = function () {
                if (!$scope.limits) return;

                xScale = d3.scale.linear()
                    .domain([0, $scope.limits.x])
                    .range([0, plotWidth]);

                yScale = d3.scale.linear()
                    .domain([0, $scope.limits.y])
                    .range([plotHeight, 0]);
            }

            var drawAxes = function () {
                if (!xScale) return;

                var xAxis = d3.svg.axis()
                    .ticks(10)
                    .scale(xScale)
                    .orient("bottom");
                var yAxis = d3.svg.axis()
                    .ticks(10)
                    .scale(yScale)
                    .orient("left");

                svg.select("g.x.axis").remove();
                svg.select("g.y.axis").remove();

                svg.append("g")
                    .classed("x axis", true)
                    .attr("transform", "translate(" + xOffset + "," + plotHeight + ")")
                    .call(xAxis);
                svg.append("g")
                    .classed("y axis", true)
                    .attr("transform", "translate(" + xOffset + ", 0)")
                    .call(yAxis);
            }

            var drawBudgetLine = function () {
                if (!$scope.budgetFunc) return;

                var coordinates = [
                    [0, $scope.budgetFunc(0)],
                    [$scope.inverseBudgetFunc(0), 0]
                ];

                var lineFunction = d3.svg.line()
                    .x(function(d) {
                        return xScale(d[0])
                    })
                    .y(function(d) {
                        return yScale(d[1])
                    })
                    
                var path = plot.select(".budget-line");
                if (path.empty()) {
                    plot.append("path")
                        .datum(coordinates)
                        .classed("budget-line", true)
                        .style("stroke", "#000000")
                        .attr("d", lineFunction);
                } else {
                    path.datum(coordinates).attr("d", lineFunction);
                }
            }

            var drawEndowment = function () {
                if (!$scope.endowment || !xScale) return;

                var dot = plot.select(".endowment-point");
                if (dot.empty()) {
                    dot = plot.append("circle");
                }
                dot.datum($scope.endowment)
                    .classed("endowment-point", true)
                    .attr("r", 5)
                    .attr("cx", function(d) {
                        return xScale(d.x);
                    })
                    .attr("cy", function(d) {
                        return yScale(d.y)
                    });
            }

            var drawSelection = function () {
                if (!$scope.selection || !xScale) return;

                var dot = plot.select(".selection-point");
                if (dot.empty()) {
                    dot = plot.append("circle");
                }
                dot.datum($scope.selection)
                    .classed("selection-point", true)
                    .attr("r", 10)
                    .attr("cx", function(d) {
                        return xScale(d[0]);
                    })
                    .attr("cy", function(d) {
                        return yScale(d[1])
                    });
            }

            var drawCursor = function () {
                if (!$scope.cursor || !xScale) return;

                var dot = plot.select(".cursor-point");
                if (dot.empty()) {
                    dot = plot.append("circle");
                }
                dot.datum($scope.cursor)
                    .classed("cursor-point", true)
                    .attr("r", 10)
                    .attr("cx", function(d) {
                        return xScale(d[0]);
                    })
                    .attr("cy", function(d) {
                        return yScale(d[1])
                    });
            }

            var redraw = function () {
                buildScales();
                drawBudgetLine();
                drawEndowment();
                drawSelection();
                drawCursor();
                drawAxes();
            }

            $scope.$watchCollection("limits", redraw);
            $scope.$watch("endowment", drawEndowment);
            $scope.$watch("selection", drawSelection);

            plot.on("click", function() {
                if (!$scope.inputEnabled) return;

                var xMouse = xScale.invert(d3.mouse(this)[0]);
                var xMin = Math.max(0, $scope.inverseBudgetFunc($scope.limits.x));
                var xMax = Math.min($scope.limits.x, $scope.inverseBudgetFunc(0))
                var x = Math.min(xMax, Math.max(xMin, xMouse));

                $scope.cursor = [x, $scope.budgetFunc(x)];
                $scope.$emit("rpPlot.click", $scope.cursor);
                drawSelection();
            });

            plot.on("mousemove", function() {
                if (!$scope.inputEnabled) return;

                var xMouse = xScale.invert(d3.mouse(this)[0]);
                var xMin = Math.max(0, $scope.inverseBudgetFunc($scope.limits.x));
                var xMax = Math.min($scope.limits.x, $scope.inverseBudgetFunc(0))
                var x = Math.min(xMax, Math.max(xMin, xMouse));

                $scope.cursor = [x, $scope.budgetFunc(x)];
                drawCursor();
            });

            plot.on("mouseout", function() {
                $scope.cursor = [$scope.endowment.x, $scope.endowment.y];
                drawCursor();
            });

            // $scope.$watch("result", drawPlot);

        }
    }
});

// Redwood.directive("rpPlot", function() {
//     return {
//         restrict: "A",
//         scope: {
//             budgetFunc: "=",
//             inverseBudgetFunc: "=",
//             endowment: "=",
//             selection: "=",
//             limits: "=",
//             inputEnabled: "=",
//             result: "=",
//          },
//          link: function($scope, $elem, attr) {

//             $scope.cursor = null
//             $scope.selection = null

//             var drawPlot = function() {

//                 // should defer until config is loaded
//                 if (!$scope.budgetFunc) {
//                     return;
//                 }

//                 if (!$scope.cursor) {
//                     $scope.cursor = [-100, -100]
//                 }

//                 var dataset = [
//                      { // Budget Line
//                         data: [[0, $scope.budgetFunc(0)], [$scope.inverseBudgetFunc(0), 0]],
//                         lines: { show: true, lineWidth: 1.5 },
//                         color: "red"
//                     },
//                     { // Hover dot
//                         data: [$scope.cursor],
//                         lines: { show: false},
//                          points: { show: true, fill: false, radius: 4 },
//                         color: "blue"
//                     },
//                     { // Selection dot
//                         data: [$scope.selection],
//                         lines: { show: false},
//                          points: { show: true, lineWidth: 4, fill: true, radius: 4 },
//                         color: "black",
//                         hoverable: false
//                     },
//                     { // endowment dot
//                         data: [[$scope.endowment.x, $scope.endowment.y]],
//                         lines: { show: false },
//                         points: { show: true, lineWidth: 5, fill: true, radius: 5 },
//                         color: "#440000",
//                         hoverable: false
//                     },
//                  ];
//                  if ($scope.result) {
//                     var resultPoint = $scope.result.chosen === "x" ? [$scope.result.x, 0] : [0, $scope.result.y];
//                     dataset.push(
//                         { // green result dot
//                             data: [resultPoint],
//                             lines: { show: false },
//                             points: { show: true, lineWidth: 4, fill: true, radius: 3 },
//                             color: "green",
//                             hoverable: false
//                         },
//                         { // green result line
//                             data: [resultPoint, $scope.selection],
//                             dashes: { show: true, lineWidth: 1 },
//                             color: "#51a351",
//                             hoverable: false
//                         },
//                         { // green result dot
//                             data: [resultPoint],
//                             lines: { show: false },
//                             points: { show: true, fill: true, radius: 1 },
//                             color: "#51a351",
//                             hoverable: false
//                         }
//                     );
//                  } else {
//                     dataset.push({ // selection dotted line (x)
//                         data: [[0, $scope.selection[1]], $scope.selection, [$scope.selection[0], 0]],
//                         lines: { show: false, lineWidth: 1.5 },
//                         dashes: { show: true, lineWidth: 1 },
//                         color: "black",
//                         hoverable: false
//                     });
//                  }

//                 var options = {
//                     grid: { clickable: true, hoverable: true },
//                     xaxis: { tickLength: 0, min: 0, max: $scope.limits.x },
//                     yaxis: { tickLength: 0, min: 0, max: $scope.limits.y },
//                     series: { shadowSize: 0 },
//                     hooks: { draw: [drawText] }
//                 };

//                 $.plot($elem, dataset, options);
//             }

//             function drawText(plot, ctx) {

//                 function offsetForPoint(plot, point) {
//                     var offset = plot.pointOffset({x: point[0], y: point[1]});
                    
//                     if (point[0] > $scope.limits.x - 25) {
//                         offset.left -= 10;
//                     } else {
//                         offset.left += 10;
//                     }

//                     if (point[1] > $scope.limits.y - 15) {
//                         offset.top += 15;
//                     } else {
//                         offset.top -= 10;
//                     }

//                     return offset;
//                 }

//                 function textAlignForPoint(point) {
//                     if (point[0] > 75) {
//                         return "end";
//                     } else {
//                         return "start";
//                     }
//                 }

//                 ctx.font = "14px sans-serif";

//                 // draw current endowment
//                 var endowmentPoint = [$scope.endowment.x, $scope.endowment.y];
//                 var offset = offsetForPoint(plot, endowmentPoint);
//                 ctx.textAlign = textAlignForPoint(endowmentPoint);

//                 ctx.fillStyle = "grey";
//                 var text = "[" + endowmentPoint[0].toFixed(2) + ", " + endowmentPoint[1].toFixed(2) + "]";
//                 ctx.fillText(text, offset.left, offset.top);

//                 // draw current selection values at axes
//                 if ($scope.selection) {
//                     var xPoint = [$scope.selection[0], 0];
//                     var yPoint = [0, $scope.selection[1]];
//                     var xOffset = offsetForPoint(plot, xPoint);
//                     var yOffset = offsetForPoint(plot, yPoint);
//                     var xText = $scope.selection[0].toFixed(2);
//                     var yText = $scope.selection[1].toFixed(2);
                    
//                     ctx.textAlign = textAlignForPoint(xPoint);
//                     ctx.fillStyle = "#d8d8d8";
//                     ctx.strkeStyle = "#000000";
//                     if (ctx.textAlign === "end") {
//                         ctx.fillRect(xOffset.left+2, xOffset.top+5, -(xText.length-1)*10, -20);
//                         ctx.strokeRect(xOffset.left+2, xOffset.top+5, -(xText.length-1)*10, -20);
//                     } else {
//                         ctx.fillRect(xOffset.left-2, xOffset.top+5, (xText.length-1)*10, -20);
//                         ctx.strokeRect(xOffset.left-2, xOffset.top+5, (xText.length-1)*10, -20);                        
//                     }

//                     ctx.fillStyle = "black";
//                     ctx.fillText(xText, xOffset.left, xOffset.top);

//                     ctx.textAlign = textAlignForPoint(yPoint);
//                     ctx.fillStyle = "#d8d8d8";
//                     if (ctx.textAlign === "end") {
//                         ctx.fillRect(yOffset.left+2, yOffset.top+5, -(yText.length-1)*10, -20);
//                         ctx.strokeRect(yOffset.left+2, yOffset.top+5, -(yText.length-1)*10, -20);
//                     } else {
//                         ctx.fillRect(yOffset.left-2, yOffset.top+5, (yText.length-1)*10, -20);
//                         ctx.strokeRect(yOffset.left-2, yOffset.top+5, (yText.length-1)*10, -20);
//                     }

//                     ctx.fillStyle = "black";
//                     ctx.fillText(yText, yOffset.left, yOffset.top);
//                 }

//                 // draw current hover value
//                 if ($scope.cursor) {
//                      var offset = offsetForPoint(plot, $scope.cursor);
//                     ctx.textAlign = textAlignForPoint($scope.cursor);

//                     ctx.fillStyle = "grey";
//                     var text = "[" + $scope.cursor[0].toFixed(2) + ", " + $scope.cursor[1].toFixed(2) + "]";
//                     ctx.fillText(text, offset.left, offset.top);
//                 }

//                 if ($scope.result) {
//                     var resultPoint = $scope.result.chosen === "x" ? [$scope.result.x, 0] : [0, $scope.result.y];
//                     var offset = offsetForPoint(plot, resultPoint);
//                     ctx.textAlign = textAlignForPoint(resultPoint);

//                     ctx.fillStyle = "#51a351";
//                     var text = $scope.result.chosen === "x" ? $scope.result.x.toFixed(2) : $scope.result.y.toFixed(2);
//                     ctx.fillText(text, offset.left, offset.top);
//                 }
//             }

//             $elem.bind("plothover", function (event, pos, item) {
//                 if (!$scope.inputEnabled) return;
//                 var xMin = Math.max(0, $scope.inverseBudgetFunc($scope.limits.x));
//                 var xMax = Math.min($scope.limits.x, $scope.inverseBudgetFunc(0))
//                 var x = Math.min(xMax, Math.max(xMin, pos.x));
//                 $scope.cursor = [x, $scope.budgetFunc(x)];
//                 drawPlot();
//             });

//             $elem.bind("plotclick", function (event, pos, item) {
//                 if (!$scope.inputEnabled) return;
//                 $scope.$emit("rpPlot.click", $scope.cursor)
//             });

//             $elem.bind("mouseout", function(event, pos, item) {
//                 $scope.cursor = [$scope.endowment.x, $scope.endowment.y];
//                 drawPlot();
//             })

//             $scope.$watch("endowment", drawPlot);
//             $scope.$watch("selection", drawPlot);
//             $scope.$watchCollection("limits", drawPlot);
//             $scope.$watch("result", drawPlot);
//         }
//     }
// });