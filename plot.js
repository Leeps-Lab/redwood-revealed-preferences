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

            var drawEndowment = function() {
                if (!$scope.endowment) return;
                drawPoint([$scope.endowment.x, $scope.endowment.y], "endowment-point");
            }

            var drawCursor = function() {
                if (!$scope.cursor) return;
                drawPoint($scope.cursor, "cursor-point");
            }

            var drawSelection = function() {
                if (!$scope.selection) return;
                drawPoint($scope.selection, "selection-point");
            }

            var drawResult = function () {
                if (!$scope.result || !xScale) return;

                var resultPoint = $scope.result.chosen === "x" ? 
                    [$scope.result.x, 0] : [0, $scope.result.y];

                drawPoint(resultPoint, "result-point");
            }

            var redraw = function () {
                buildScales();
                drawBudgetLine();
                drawEndowment();
                drawSelection();
                drawCursor();
                drawResult();
                drawAxes();
            }

            $scope.$watchCollection("limits", redraw);
            $scope.$watch("endowment", drawEndowment);
            $scope.$watch("selection", drawSelection);
            $scope.$watch("result", drawResult);

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
        }
    }
});
