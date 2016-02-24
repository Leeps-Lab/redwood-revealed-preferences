RedwoodRevealedPreferences.directive("rpPlot", function ($window) {

    function toPx(number) {
        return number.toString() + "px";
    }

    return {
        restrict: "A",
        scope: {
            budgetFunc: "=",
            inverseBudgetFunc: "=",
            constraintsX: "=?",
            endowment: "=?",
            selection: "=",
            limits: "=",
            inputEnabled: "=",
            result: "=",
            probX: "=",
            labelX: "=",
            labelY: "=",
            width: "=",
            height: "=",
         },
         templateUrl: '/static/experiments/redwood-revealed-preferences/plot/rpPlot.html',
         link: function ($scope, $elem, attr) {
            console.log($scope)
            var elem = d3.select($elem[0])
            var svg = elem.select("svg");

            var xOffset = 50;
            var yOffset = 50;
            var plotWidth = $scope.width - 2 * xOffset;
            var plotHeight = $scope.height - 2 * yOffset;

            var axes = svg.append("g");

            var plot = svg.append("g")
                .attr("transform", "translate(" + xOffset + "," + yOffset + ")");

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
                        .text($scope.labelX + " (Probability: " + $scope.probX.toFixed(2) + ")");
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
                        .text($scope.labelY + " (Probability: " + (1-$scope.probX).toFixed(2) + ")");
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
                
                // constrain line to plot boundaries
                var pointA = [0, $scope.budgetFunc(0)];
                if (pointA[1] > $scope.limits.y) {
                    pointA = [$scope.inverseBudgetFunc($scope.limits.y), $scope.limits.y];
                }

                var pointB = [$scope.inverseBudgetFunc(0), 0];
                if (pointB[0] > $scope.limits.y) {
                    pointB = [$scope.limits.x, $scope.budgetFunc($scope.limits.x)];
                }

                var coordinates = [pointA, pointB];

                drawLine(coordinates, "budget-line");
            }

            var drawEndowment = function () {
                if (!$scope.endowment) return;
                drawPoint([$scope.endowment.x, $scope.endowment.y], "endowment-point");

                // draw label
                var point = elem.select(".endowment-point");
                var label = elem.select(".endowment-label");

                if (point[0][0]) {
                    var pointRect = point[0][0].getBoundingClientRect();
                    var labelRect = label[0][0].getBoundingClientRect();
                    label.style({
                        "position": "fixed",
                        "top": toPx(pointRect.top-labelRect.height),
                        "left": toPx(pointRect.left+pointRect.width)
                    });
                }
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
                    "left": toPx(plotRect.left-xOffset*2.5)
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
                // hack to make sure that the labelRect has the correct dimensions
                // when the selection label is just coming out of hiding
                labelRect = label[0][0].getBoundingClientRect();
                label.style({
                    "position": "fixed",
                    "top": toPx(pointRect.top+pointRect.height),
                    "left": toPx(pointRect.left-labelRect.width)
                });
            }

            var drawConstraintPoints = function() {
                if ($scope.constraintsX && $scope.budgetFunc) {
                    $scope.constraintsX.forEach(function(x) {
                        var point = [x, $scope.budgetFunc(x)];
                        drawPoint(point, "constraint-point-" + x);
                        plot.select(".constraint-point-" + x).classed("constraint-point", true)
                    })
                }
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
                drawConstraintPoints();
                drawSelection();
                drawCursor();
                drawResult();
            }

            var setCursorPosition = function() {
                if (!$scope.inputEnabled) return;
                // fade labels
                elem.selectAll(".point-label").classed("transparent", true);

                // get mouse x point
                var xMouse = xScale.invert(d3.mouse(plot[0][0])[0]);

                // constrain x to certain points, if specified
                if ($scope.constraintsX) {
                    // linear search to find the closest x
                    var closest = Infinity;
                    var closestDistance = Infinity;
                    for (var i = 0; i < $scope.constraintsX.length; ++i) {
                        var candidate = $scope.constraintsX[i];
                        var distance = Math.abs(candidate - xMouse)
                        if (distance < closestDistance) {
                            closest = candidate;
                            closestDistance = distance;
                        }
                    }
                    if (closest != Infinity) {
                        xMouse = closest;
                    }
                }

                // constrain x to boundaries
                var xMin = Math.max(0, $scope.inverseBudgetFunc($scope.limits.x));
                var xMax = Math.min($scope.limits.x, $scope.inverseBudgetFunc(0));
                var x = Math.min(xMax, Math.max(xMin, xMouse));

                // set the new cursor point
                $scope.$apply(function () {
                    $scope.cursor = [x, $scope.budgetFunc(x)];
                });

                drawCursor();
            }

            // Set up watches and event handlers

            $scope.$watchCollection("limits", redraw);
            $scope.$watch("budgetFunc", redraw);
            $scope.$watch("endowment", drawEndowment);
            $scope.$watch("selection", drawSelection);
            $scope.$watch("result", drawResult);

            angular.element($window).bind('resize', function() {
                drawSelection();
                drawEndowment();
                drawResult();
            });

            angular.element($window).bind('scroll', function() {
                drawSelection();
                drawEndowment();
                drawCursor();
                drawResult();
            });

            svg.on("click", function() {
                if (!$scope.inputEnabled) return;
                if (!$scope.cursor) setCursorPosition();
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

            svg.on("mousemove", setCursorPosition);

            svg.on("mouseleave", function() {
                elem.selectAll(".point-label").classed("transparent", false);
                $scope.cursor = null;
                drawCursor();
            });
        }
    }
});
