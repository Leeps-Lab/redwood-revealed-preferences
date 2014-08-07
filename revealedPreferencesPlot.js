
Redwood.directive("rpPlot", function() {
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
         },
         link: function($scope, $elem, attr) {

            $scope.cursor = null
            $scope.selection = null

            var drawPlot = function() {

                // should defer until config is loaded

                if (!$scope.cursor) {
                    $scope.cursor = [-100, -100]
                }

                var dataset = [
                     { // Budget Line
                        data: [[0, $scope.budgetFunc(0)], [$scope.inverseBudgetFunc(0), 0]],
                        lines: { show: true, lineWidth: 1.5 },
                        color: "red"
                    },
                    { // Hover dot
                        data: [$scope.cursor],
                        lines: { show: false},
                         points: { show: true, fill: false, radius: 4 },
                        color: "blue"
                    },
                    { // Selection dot
                        data: [$scope.selection],
                        lines: { show: false},
                         points: { show: true, lineWidth: 4, fill: true, radius: 4 },
                        color: "black",
                        hoverable: false
                    },
                    { // endowment dot
                        data: [[$scope.endowment.x, $scope.endowment.y]],
                        lines: { show: false },
                        points: { show: true, lineWidth: 4, fill: true, radius: 3 },
                        color: "grey",
                        hoverable: false
                    },
                    { // endowment dot
                        data: [[$scope.endowment.x, $scope.endowment.y]],
                        lines: { show: false },
                        points: { show: true, fill: true, radius: 1 },
                        color: "grey",
                        hoverable: false
                    }
                 ];
                 if ($scope.result) {
                    var resultPoint = $scope.result.chosen === "x" ? [$scope.result.x, 0] : [0, $scope.result.y];
                    dataset.push(
                        { // green result dot
                            data: [resultPoint],
                            lines: { show: false },
                            points: { show: true, lineWidth: 4, fill: true, radius: 3 },
                            color: "green",
                            hoverable: false
                        },
                        { // green result line
                            data: [resultPoint, $scope.selection],
                            dashes: { show: true, lineWidth: 1 },
                            color: "#51a351",
                            hoverable: false
                        },
                        { // green result dot
                            data: [resultPoint],
                            lines: { show: false },
                            points: { show: true, fill: true, radius: 1 },
                            color: "#51a351",
                            hoverable: false
                        }
                    );
                 } else {
                    dataset.push({ // selection dotted line (x)
                        data: [[0, $scope.selection[1]], $scope.selection, [$scope.selection[0], 0]],
                        lines: { show: false, lineWidth: 1.5 },
                        dashes: { show: true, lineWidth: 1 },
                        color: "black",
                        hoverable: false
                    });
                 }

                var options = {
                    grid: { clickable: true, hoverable: true },
                    xaxis: { tickLength: 0, min: 0, max: $scope.limits.x },
                    yaxis: { tickLength: 0, min: 0, max: $scope.limits.y },
                    series: { shadowSize: 0 },
                    hooks: { draw: [drawText] }
                };

                $.plot($elem, dataset, options);
            }

            function drawText(plot, ctx) {

                function drawTextForPoint(plot, ctx, point) {
                    var offset = plot.pointOffset({x: point[0], y: point[1]});

                    if (point[0] > 75) {
                        ctx.textAlign = "end";
                        offset.left -= 10;
                    } else {
                        ctx.textAlign = "start";
                        offset.left += 10;
                    }

                    if (point[1] > 85) {
                        offset.top += 15;
                    } else {
                        offset.top -= 10;
                    }

                    var text = "[" + point[0].toFixed(2) + ", " + point[1].toFixed(2) + "]";
                    ctx.font = "14px sans-serif";
                    ctx.fillText(text, offset.left, offset.top);
                }

                if ($scope.cursor) {
                    ctx.fillStyle = "grey";
                    drawTextForPoint(plot, ctx, $scope.cursor);
                }

                if ($scope.selection) {
                    ctx.fillStyle = "black";
                    drawTextForPoint(plot, ctx, $scope.selection);
                }

                // endowment
                ctx.fillStyle = "grey";
                drawTextForPoint(plot, ctx, [$scope.endowment.x, $scope.endowment.y]);

                if ($scope.result) {
                    var resultPoint = $scope.result.chosen === "x" ? [$scope.result.x, 0] : [0, $scope.result.y];
                    ctx.fillStyle = "#51a351";
                    drawTextForPoint(plot, ctx, resultPoint);
                }
            }

            $elem.bind("plothover", function (event, pos, item) {
                if (!$scope.inputEnabled) return;
                var xMin = Math.max(0, $scope.inverseBudgetFunc($scope.limits.x));
                var xMax = Math.min($scope.limits.x, $scope.inverseBudgetFunc(0))
                var x = Math.min(xMax, Math.max(xMin, pos.x));
                $scope.cursor = [x, $scope.budgetFunc(x)];
                drawPlot();
            });

            $elem.bind("plotclick", function (event, pos, item) {
                if (!$scope.inputEnabled) return;
                $scope.$emit("rpPlot.click", $scope.cursor)
            });

            $scope.$watch("endowment", drawPlot);
            $scope.$watch("selection", drawPlot);
            $scope.$watch("result", function() {
                if ($scope.endowment) {
                    // don't draw unless the config has loaded
                    drawPlot();
                }
            });
        }
    }
});