Redwood.controller("RPAdminAdditionsController", ["Admin", "$scope", function(ra, $scope) {
    
    // The admin is in charge of deciding results
    var outcome;
    ra.recv("next_round", function() {
        outcome = false; // reset outcome
    });

    ra.recv("perform_allocation", function(sender, allocation) {
        // if an outcome has not yet been determined for this round, do it here
        if (!outcome) {
            outcome = Math.random() < ra.get_config().ProbX ? "x" : "y";
        }
        // send as the subject who sent the confirm message
        ra.sendAsSubject("result", {x: allocation.x, y: allocation.y, chosen: outcome}, sender);
    });
}]);