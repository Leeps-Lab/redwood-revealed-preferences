Redwood.directive("choiceView", ["RedwoodSubject", "$filter", function(rs, $filter) {
  return {
    scope: {
      choice: "=",
      treatment: "=",
      showProbability: "=?",
      showPayoff: "=?",
      primaryColor1: "=",
      secondaryColor1: "=",
      primaryColor2: "=",
      secondaryColor2: "=",
      heightScale: "="
    },
    templateUrl: "/static/experiments/redwood-holt-laury/choiceView.html",
    link: function postLink($scope, $element, attrs) {
      $scope.viewWidth = 410;
      $scope.viewHeight = 80;

      var prepareFunctions = {
        "text": function($scope, choice) {
          $scope.dollar0 = choice[0].payoff;
          $scope.dollar1 = choice[1].payoff;
        },
        "bar": function($scope, choice) {
          $scope.width0 = choice[0].chance * $scope.viewWidth;
          $scope.width1 = choice[1].chance * $scope.viewWidth;
          $scope.textPosition1 = Math.max($scope.width0 / 2, 50);
          $scope.textPosition2 = $scope.width0 + $scope.width1 / 2;
        },
        "bar-height": function($scope, choice) {
          $scope.width0 = choice[0].chance * $scope.viewWidth;
          $scope.width1 = choice[1].chance * $scope.viewWidth;
          $scope.maxHeight = $scope.viewHeight/2;
          $scope.height0 = choice[0].payoff/4.0 * $scope.maxHeight;
          $scope.height1 = choice[1].payoff/4.0 * $scope.maxHeight;
          $scope.textPosition1 = Math.max($scope.width0 / 2, 50);
          $scope.textPosition2 = $scope.width0 + $scope.width1 / 2;

          $scope.payoffText0Position = [
            -20,
            $scope.maxHeight - $scope.height0
          ];

          $scope.probText0Position = [
              $scope.width0 / 2,
              $scope.maxHeight + 20
          ];

          $scope.payoffText1Position = [
            $scope.viewWidth + 20,
            $scope.maxHeight - $scope.height1
          ];

          $scope.probText1Position = [
              $scope.width0 + $scope.width1 / 2,
              $scope.maxHeight + 20
          ];
        },
        "bar-inverted": function($scope, choice) {
          $scope.width0 = choice[0].chance * $scope.viewWidth;
          $scope.width1 = choice[1].chance * $scope.viewWidth;
          $scope.textX0 = $scope.width0 < 150 ? $scope.width0 + 10 : $scope.width0 - 10;
          $scope.textX1 = $scope.width1 < 150 ? $scope.width1 + 10 : $scope.width1 - 10;
          $scope.textAnchor0 = $scope.width0 < 150 ? "start" : "end";
          $scope.textAnchor1 = $scope.width1 < 150 ? "start" : "end";
        },
        "pie": function($scope, choice) {},
        "pie-height": function($scope, choice) {}
      }

      var drawLegend = function(context, colors, choice) {
        context.fillStyle = colors[0];
        context.fillRect(120, 10, 20, 20);

        context.fillStyle = colors[1];
        context.fillRect(120, 50, 20, 20);

        context.fillStyle = "#000000";
        context.font = "14px sans-serif";
        context.textBaseline = "middle";

        var choiceText0 = "";
        var choiceText1 = "";

        if ($scope.showProbability) {
          choiceText0 += $filter("fraction")(choice[0].chance, 10);
          choiceText1 += $filter("fraction")(choice[1].chance, 10);
        }

        if ($scope.showProbability && $scope.showPayoff) {
          choiceText0 += " of ";
          choiceText1 += " of ";
        }

        if ($scope.showPayoff) {
          choiceText0 += "$"+choice[0].payoff.toFixed(2);
          choiceText1 += "$"+choice[1].payoff.toFixed(2);
        }

        context.fillText(choiceText0, 150, 20);
        context.fillText(choiceText1, 150, 60);
      }

      prepareFunctions[$scope.treatment]($scope, $scope.choice);

      $scope.drawPie = function() {
        var colors = [$scope.primaryColor1, $scope.primaryColor2];
        var context = $element[0].getElementsByTagName("canvas")[0].getContext("2d");

        context.clearRect(0, 0, $scope.viewWidth, $scope.viewHeight);
        draw_pie(context, 50, 40, 40, $scope.choice, colors);
        drawLegend(context, colors, $scope.choice)
      }

      // hack to make sure that the completely filled pies display correctly
      $scope.angleOffset = 0.0001;
      $scope.doRotate = function($event) {
        $scope.angleOffset = ($scope.viewWidth - $event.offsetX) / $scope.viewWidth * Math.PI * 2;
      }

      //$scope.$watch("heightScale", $scope.drawPieHeight);

      $scope.drawPieHeight = function() {
        console.log("scale: " + $scope.heightScale);
        var colors = [[$scope.primaryColor1, $scope.secondaryColor1], [$scope.primaryColor2, $scope.secondaryColor2]];
        var elem = $element[0].getElementsByTagName("canvas");
        var context = elem[0].getContext("2d");
        context.clearRect(0, 0, $scope.viewWidth, $scope.viewHeight);
        draw_pie_3d(context, 50, 0, 110, 50, $scope.heightScale, $scope.angleOffset, $scope.choice, colors);
        drawLegend(context, [$scope.primaryColor1, $scope.primaryColor2], $scope.choice);
      }
    }
  };
}]);
