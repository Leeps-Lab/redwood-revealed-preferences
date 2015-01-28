Redwood.controller("RPAdminAdditionsController", ["Admin", "$scope", function(ra, $scope) {
    
    // The admin is in charge of deciding results
    var outcome;
    ra.recv("rp.next_round", function() {
        outcome = false; // reset outcome
    });

    ra.recv("rp.perform_allocation", function(sender, allocation) {
        // if an outcome has not yet been determined for this round, do it here
        if (!outcome) {
            var period = ra.subject[sender].period;
            outcome = Math.random() < ra.get_config(period).ProbX ? "x" : "y";
        }
        // send as the subject who sent the confirm message
        ra.sendAsSubject("rp.result", {x: allocation.x, y: allocation.y, chosen: outcome}, sender);
    });
}]);