# redwood-revealed-preferences
Arrow securities risk elicitation experiment.


####Tatonnement
At the beginning of every TTM period we choose endowments for every subject based on the decisions made in previous non-TTM periods.
The algorithm found in [Dropbox/Edgeworks 2013/ChoiceAndTatonnement/AssignEndowments.pdf](https://www.dropbox.com/s/k0hcu2nl9h4gs7c/AssignEndowments.pdf?dl=0) determines the endowment for each subject. This endowment is used in every round of the TTM period.

The tatonnement algorithm is outlined in [Dropbox/Edgeworks 2013/ChoiceAndTatonnement/Design.pdf](https://www.dropbox.com/s/r0izezd1btl60r6/Design.pdf?dl=0).



####Default Configuration Parameters
######Endowment, Price and Probability Options
-  Ex                      : 0,
-  Ey                      : 0,
-  Price                   : 1,
-  ProbX                   : 0.5,
-  useDefaultSelection     : false

######Tatonnement Options
-  epsilon1                : 1,  -- TTM will end after `roundsUnderEpsilon` rounds with (excess demand under `epsilon1`) OR
-  epsilon2                : 2,  -- (excess demand under `epsilon2` and prices off the grid)
-  roundsUnderEpsilon      : 2,
-  expectedExcess          : 13.5, -- `ez` in *Tatonnement Algorithm*
-  priceGrid               : [0.2, 0.4, 0.5, 0.57, 0.63, 0.69, 0.75, 0.81, 0.87, 0.94, 1, 1.07, 1.17, 1.5],
-  weightVector            : [0.1745, 0.08725, 0.043625, 0.0218125, 0.01090625],
-  marketMaker             : true, -- `mm` in *TA*
-  snapPriceToGrid         : true, -- `g` in *TA*
-  priceLowerBound         : 0.01,
-  priceUpperBound         : 100.0,
-  maxAngularDiff          : 0.26175,

######Endowment Assignment Options
-  computeEndowment        : false, -- If true, the following parameters are needed
  -  Ax                      : 100, 
  -  Ay                      : 0,   -- Must be the value of the two sets of X and Y
  -  Bx                      : 0,   -- endowments used in part 1 of experiment
  -  By                      : 50,        
-  minimizeEquilibriumPrice: false,
-  saveAllocation          : false

######Visual Options
-  XLimit                  : 100,
-  YLimit                  : 100,
-  labelX                  : "X",
-  labelY                  : "Y",
-  limitAnimDuration       : 0,
-  plotResult              : true,
-  showEndowment           : true,
-  showTable               : false,
-  showMaxPayouts          : true

######Interaction Options
-  constraintsX            : false

######Timing Options
-  rounds                  : 1,
-  delay                   : 5,
-  timeLimit               : 0,
-  pause                   : false,