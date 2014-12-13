Redwood.directive("rpPlot", function ($compile) {

    function toPx(number) {
        return number.toString() + "px";
    }

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
            probX: "=",
            width: "=",
            height: "=",
         },
         template: '<svg width="{{width}}" height="{{height}}" shape-rendering="optimizeSpeed"></svg>\
                    <div class="point-label endowment-label">\
                        Endowment:\
                        {{endowment.x | number: 2}}, {{endowment.y | number: 2}}\
                    </div>\
                    <div class="point-label selection-label">\
                        Selection:\
                        {{selection[0] | number: 2}}, {{selection[1] | number: 2}}\
                    </div>\
                    <div class="result-label">\
                        Result:\
                        <span ng-switch on="resultPoint[1]">\
                            <span ng-switch-when="0">\
                                X = {{resultPoint[0] | number: 2}}\
                            </span>\
                            <span ng-switch-default>\
                                Y = {{resultPoint[1] | number: 2}}\
                            </span>\
                        </span>\
                    </div>\
                    <div class="hover-label x">{{cursor[0] | number: 2}}</div>\
                    <div class="hover-label y">{{cursor[1] | number: 2}}</div>',
         link: function ($scope, $elem, attr) {

            var elem = d3.select($elem[0])
            var svg = elem.select("svg");

            var xOffset = 50;
            var yOffset = 50;
            var plotWidth = $scope.width - 2 * xOffset;
            var plotHeight = $scope.height - 2 * yOffset;

            svg.append("clipPath")
                .attr("id", "clipPath")
                .append("rect")
                    .attr("width", plotWidth)
                    .attr("height", plotHeight);

            var axes = svg.append("g");

            var plot = svg.append("g")
                .attr("transform", "translate(" + xOffset + "," + yOffset + ")")
                .attr("clip-path", "url(#clipPath)");

            var plotBackground = plot.append("rect")
                .classed("plot-background", true)
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
                if (!$scope.probX || !xScale) return;

                var xAxis = d3.svg.axis()
                    .ticks(10)
                    .scale(xScale)
                    .orient("bottom");
                var yAxis = d3.svg.axis()
                    .ticks(10)
                    .scale(yScale)
                    .orient("left");

                axes.select("g.x.axis").remove();
                axes.select("g.y.axis").remove();

                axes.append("g")
                    .classed("x axis", true)
                    .attr("transform", "translate(" + xOffset + "," + (plotHeight+yOffset) + ")")
                    .call(xAxis)
                    .append("text")
                        .classed("axis-label", true)
                        .attr("text-anchor", "middle")
                        .attr("x", plotWidth/2)
                        .attr("y", yOffset - 5)
                        .text("Amount of X (Probability: " + $scope.probX.toFixed(2) + ")");
                axes.append("g")
                    .classed("y axis", true)
                    .attr("transform", "translate(" + xOffset + "," + yOffset + ")")
                    .call(yAxis)
                    .append("text")
                        .classed("axis-label", true)
                        .attr("text-anchor", "middle")
                        .attr("transform", "rotate(-90)")
                        .attr("x", -plotHeight/2)
                        .attr("y", -xOffset + 10)
                        .text("Amount of Y (Probability: " + (1-$scope.probX).toFixed(2) + ")");
            }

            var drawLine = function (coordinates, className) {
                var lineFunction = d3.svg.line()
                    .x(function(d) {
                        return xScale(d[0])
                    })
                    .y(function(d) {
                        return yScale(d[1])
                    })
                    
                var path = plot.select("." + className);
                if (path.empty()) {
                    plot.append("path")
                        .datum(coordinates)
                        .classed(className, true)
                        .attr("d", lineFunction);
                } else {
                    path.datum(coordinates).attr("d", lineFunction);
                }
            }

            var drawPoint = function (point, className) {
                if (!xScale) return;

                var dot = plot.select("." + className);
                if (dot.empty()) {
                    dot = plot.append("circle");
                }
                dot.datum(point)
                    .classed(className, true)
                    .attr("r", 5)
                    .attr("cx", function(d) {
                        return xScale(d[0]);
                    })
                    .attr("cy", function(d) {
                        return yScale(d[1])
                    });
            }

            var drawBudgetLine = function () {
                if (!$scope.budgetFunc) return;
                var coordinates = [
                    [0, $scope.budgetFunc(0)],
                    [$scope.inverseBudgetFunc(0), 0]
                ];
                drawLine(coordinates, "budget-line");
            }

            var drawEndowment = function () {
                if (!$scope.endowment) return;
                drawPoint([$scope.endowment.x, $scope.endowment.y], "endowment-point");

                // draw label
                var point = elem.select(".endowment-point");
                var label = elem.select(".endowment-label");
                var pointRect = point[0][0].getBoundingClientRect();
                var labelRect = label[0][0].getBoundingClientRect();
                label.style({
                    "position": "fixed",
                    "top": toPx(pointRect.top-labelRect.height),
                    "left": toPx(pointRect.left+pointRect.width)
                });
            }

            var drawCursor = function () {
                if (!$scope.cursor) {
                    elem.select(".cursor-point").remove();
                    elem.select(".cursor-crosshair-x").remove();
                    elem.select(".cursor-crosshair-y").remove();
                    elem.selectAll(".hover-label").style("display", "none");
                    return;
                }
                drawPoint($scope.cursor, "cursor-point");
                drawLine([$scope.cursor, [$scope.cursor[0], 0]], "cursor-crosshair-x");
                drawLine([$scope.cursor, [0, $scope.cursor[1]]], "cursor-crosshair-y");

                // draw hover labels
                var xHoverLabel = elem.select(".hover-label.x");
                var yHoverLabel = elem.select(".hover-label.y");

                var plotRect = plotBackground[0][0].getBoundingClientRect();
                var xLabelRect = xHoverLabel[0][0].getBoundingClientRect();
                var yLabelRect = yHoverLabel[0][0].getBoundingClientRect();

                elem.selectAll(".hover-label").style("display", "block");
                xHoverLabel.style({
                    "position": "fixed",
                    "top": toPx(plotRect.bottom+yOffset),
                    "left": toPx(plotRect.left+xScale($scope.cursor[0])-xLabelRect.width/2)
                });
                yHoverLabel.style({
                    "position": "fixed",
                    "top": toPx(plotRect.top+yScale($scope.cursor[1])-yLabelRect.height/2),
                    "left": toPx(plotRect.left-xOffset*3)
                });
            }

            var drawSelection = function () {
                if (!$scope.selection) return;
                drawPoint($scope.selection, "selection-point");

                // draw label
                var point = elem.select(".selection-point");
                var label = elem.select(".selection-label");
                var pointRect = point[0][0].getBoundingClientRect();
                var labelRect = label[0][0].getBoundingClientRect();
                label.style({
                    "position": "fixed",
                    "top": toPx(pointRect.top+pointRect.height),
                    "left": toPx(pointRect.left-labelRect.width)
                });
            }

            var drawResult = function () {
                if (!$scope.result || !xScale) return;

                $scope.resultPoint = $scope.result.chosen === "x" ? 
                    [$scope.result.x, 0] : [0, $scope.result.y];

                drawPoint($scope.resultPoint, "result-point");
                drawLine([$scope.selection, $scope.resultPoint], "result-line");

                // hide other labels
                elem.selectAll(".point-label").classed("transparent", true);

                // draw label
                var point = elem.select(".result-point");
                var label = elem.select(".result-label");
                var pointRect = point[0][0].getBoundingClientRect();
                var labelRect = label[0][0].getBoundingClientRect();
                label.style({
                    "display": "block",
                    "position": "fixed",
                    "top": toPx(pointRect.top+pointRect.height),
                    "left": toPx(pointRect.left-labelRect.width)
                });
            }

            var redraw = function () {
                buildScales();
                drawAxes();
                drawBudgetLine();
                drawEndowment();
                drawSelection();
                drawCursor();
                drawResult();
            }

            $scope.$watchCollection("limits", redraw);
            $scope.$watch("budgetFunc", redraw);
            $scope.$watch("endowment", drawEndowment);
            $scope.$watch("selection", drawSelection);
            $scope.$watch("result", drawResult);

            svg.on("click", function() {
                if (!$scope.inputEnabled) return;
                $scope.$emit("rpPlot.click", $scope.cursor);
                drawSelection();

                if (!xScale) return;
                plot.append("circle")
                    .datum($scope.cursor)
                    .classed("selection-ping", true)
                    .attr("r", 50)
                    .attr("cx", function(d) {
                        return xScale(d[0]);
                    })
                    .attr("cy", function(d) {
                        return yScale(d[1])
                    })
                    .transition()
                        .duration(500)
                        .ease(d3.ease("cubic-out-in"))
                        .attr("r", 5)
                        .remove();
            });

            svg.on("mousemove", function() {
                if (!$scope.inputEnabled) return;
                elem.selectAll(".point-label").classed("transparent", true);

                var xMouse = xScale.invert(d3.mouse(plot[0][0])[0]);
                var xMin = Math.max(0, $scope.inverseBudgetFunc($scope.limits.x));
                var xMax = Math.min($scope.limits.x, $scope.inverseBudgetFunc(0))
                var x = Math.min(xMax, Math.max(xMin, xMouse));

                $scope.$apply(function () {
                    $scope.cursor = [x, $scope.budgetFunc(x)];
                });
                drawCursor();
            });

            svg.on("mouseleave", function() {
                elem.selectAll(".point-label").classed("transparent", false);
                $scope.cursor = null;
                drawCursor();
            });
        }
    }
});
