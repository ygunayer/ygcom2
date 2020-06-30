title: Bread Calculator
layout: tool
activeMenuItem: tools
pageType: page
---
You can use this tool to calculate the ingredient amounts for baking bread. If you're not familiar with some of the terms, refer to the [glossary section](#glossary)

<form action="/" id="calculator">
    <fieldset>
        <legend>Ingredients</legend>
        <table>
        <tbody>
            <tr>
                <th>Levain</th>
                <td><input type="text" starter-amount value="150" />g</td>
                <td>at <input type="text" starter-hydration value="100" />% Hydration</td>
            </tr>
            <tr>
                <th>Flour</th>
                <td><input type="text" flour value="" />g</td>
                <td></td>
            </tr>
            <tr>
                <th>Water</th>
                <td><input type="text" water value="" />g</td>
                <td></td>
            </tr>
        </tbody>
        </table>
    </fieldset>
    <fieldset>
        <legend>Yield</legend>
        <table>
        <tbody>
            <tr>
                <th>Total Flour</th>
                <td colspan="2"><span total-flour></span></td>
            </tr>
            <tr>
                <th>Total Water</th>
                <td colspan="2"><span total-water></span></td>
            </tr>
            <tr>
                <th>Bread</th>
                <td><input type="text" bread-weight value="" />g</td>
                <td>at <input type="text" bread-hydration value="" />% Hydration</td>
            </tr>
            <tr>
                <td colspan="3">
                    <button type="submit">Calculate</button>
                </td>
            </tr>
        </tbody>
        </table>
    </fieldset>
</form>

## Glossary  
Autolyze
: Process of mixing water and flour before adding the levain or salt.

Baker's Percentage
: A method of representing ingredient amounts as a percentage of the total amount of flour in a mixture.<br />See the following table for an example:

| Ingredient | Actual Amount | Real Percentage | Baker's Percentage |
|------------|:-------------:|:---------------:|:------------------:|
| White Flour | 100g | 32.9% | 50% |
| Whole Wheat Flour | 100g | 32.9% | 50% |
| Water | 100g | 32.9% | 50% |
| Salt | 4g | 1.3% | 2% |

Hydration
: The ratio of flour to water in a mixture, in baker's percentages.

Levain
: A sourdough starter that's been recently fed and matured. Levain is typically added to the flour and water mixture when it reaches its peak rise.

Starter
: Also called a sourdough starter, a mixture of flour and water that has developed yeast and become acidic, gaining a sour smell and taste.

<script type="text/javascript">
    function init(form) {
        var elStarterAmount = form.querySelector('[starter-amount]');
        var elStarterHydration = form.querySelector('[starter-hydration]');
        var elFlour = form.querySelector('[flour]'); // TODO allow multiple flour inputs
        var elWater = form.querySelector('[water]');

        var elBreadWeight = form.querySelector('[bread-weight]');
        var elBreadHydration = form.querySelector('[bread-hydration]');

        var elTotalFlour = form.querySelector('[total-flour]');
        var elTotalWater = form.querySelector('[total-water]');

        function valueOf(elem) { return isNaN(elem.value) ? 0 : parseFloat(elem.value); }

        function collectInput() {
            var starter = {
                amount: valueOf(elStarterAmount),
                hydration: valueOf(elStarterHydration) / 100.0
            };

            var flour = valueOf(elFlour);
            var water = valueOf(elWater);

            var bread = {
                weight: valueOf(elBreadWeight),
                hydration: valueOf(elBreadHydration) / 100.0
            };

            return {
                starter: starter,
                flour: flour,
                water: water,
                bread: bread
            };
        }

        function calculate(intent) {
            var values = collectInput();

            if (intent == 'bread') {
                var starterFlour = values.starter.amount / (1 + values.starter.hydration);
                var starterWater = values.starter.amount - starterFlour;

                var totalFlour = starterFlour + values.flour;
                var totalWater = starterWater + values.water;

                var totalBread = totalFlour + totalWater;
                var breadHydration = 100 * totalWater / totalFlour;

                elBreadWeight.value = Math.floor(totalBread);
                elBreadHydration.value = breadHydration.toFixed(2);

                elTotalFlour.innerHTML = totalFlour.toFixed(0) + 'g';
                elTotalWater.innerHTML = totalWater.toFixed(0) + 'g';
            }

            if (intent == 'ingredients') {
                throw new Error('Not supported yet');
            }
        }

        function onInput(event) {
            // TODO determine input
            calculate('bread');
        }

        [elStarterAmount, elStarterHydration, elFlour, elWater]
            .forEach(function(elem) {
                elem.addEventListener('keypress', onInput);
                elem.addEventListener('keyup', onInput);
            });

        form.addEventListener('submit', function(event) {
            event.preventDefault();
            calculate('bread');
        })
    }

    init(document.getElementById('calculator'));
</script>
