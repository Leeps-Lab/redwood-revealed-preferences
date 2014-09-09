
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

                function offsetForPoint(plot, point) {
                    var offset = plot.pointOffset({x: point[0], y: point[1]});
                    
                    if (point[0] > 75) {
                        offset.left -= 10;
                    } else {
                        offset.left += 10;
                    }

                    if (point[1] > 85) {
                        offset.top += 15;
                    } else {
                        offset.top -= 10;
                    }

                    return offset;
                }

                function textAlignForPoint(point) {
                    if (point[0] > 75) {
                        return "end";
                    } else {
                        return "start";
                    }
                }

                ctx.font = "14px sans-serif";

                // draw current endowment
                var endowmentPoint = [$scope.endowment.x, $scope.endowment.y];
                var offset = offsetForPoint(plot, endowmentPoint);
                ctx.textAlign = textAlignForPoint(endowmentPoint);

                ctx.fillStyle = "grey";
                var text = "[" + endowmentPoint[0].toFixed(2) + ", " + endowmentPoint[1].toFixed(2) + "]";
                ctx.fillText(text, offset.left, offset.top);

                // draw current selection values at axes
                if ($scope.selection) {
                    var xPoint = [$scope.selection[0], 0];
                    var yPoint = [0, $scope.selection[1]];
                    var xOffset = offsetForPoint(plot, xPoint);
                    var yOffset = offsetForPoint(plot, yPoint);
                    var xText = $scope.selection[0].toFixed(2);
                    var yText = $scope.selection[1].toFixed(2);
                    
                    ctx.textAlign = textAlignForPoint(xPoint);
                    ctx.fillStyle = "#d8d8d8";
                    if (ctx.textAlign === "end") {
                        ctx.fillRect(xOffset.left+2, xOffset.top+5, -(xText.length-1)*10, -20)
                    } else {
                        ctx.fillRect(xOffset.left-2, xOffset.top+5, (xText.length-1)*10, -20)
                    }

                    ctx.fillStyle = "black";
                    ctx.fillText(xText, xOffset.left, xOffset.top);

                    ctx.textAlign = textAlignForPoint(yPoint);
                    ctx.fillStyle = "#d8d8d8";
                    if (ctx.textAlign === "end") {
                        ctx.fillRect(yOffset.left+2, yOffset.top+5, -(yText.length-1)*10, -20)
                    } else {
                        ctx.fillRect(yOffset.left-2, yOffset.top+5, (yText.length-1)*10, -20)
                    }

                    ctx.fillStyle = "black";
                    ctx.fillText(yText, yOffset.left, yOffset.top);
                }

                // draw current hover value
                if ($scope.cursor) {
                     var offset = offsetForPoint(plot, $scope.cursor);
                    ctx.textAlign = textAlignForPoint($scope.cursor);

                    ctx.fillStyle = "grey";
                    var text = "[" + $scope.cursor[0].toFixed(2) + ", " + $scope.cursor[1].toFixed(2) + "]";
                    ctx.fillText(text, offset.left, offset.top);
                }

                if ($scope.result) {
                    var resultPoint = $scope.result.chosen === "x" ? [$scope.result.x, 0] : [0, $scope.result.y];
                    var offset = offsetForPoint(plot, resultPoint);
                    ctx.textAlign = textAlignForPoint(resultPoint);

                    ctx.fillStyle = "#51a351";
                    var text = $scope.result.chosen === "x" ? $scope.result.x.toFixed(2) : $scope.result.y.toFixed(2);
                    ctx.fillText(text, offset.left, offset.top);
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