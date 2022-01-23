title: Income Tax Calculator
layout: tool
activeMenuItem: tools
pageType: page
---
You can use this tool to calculate the income tax for any given amount.

> Note: These rates are specific to Turkey.

<form action="/" id="calculator">
  <div>
    <strong>Select a Year:</strong>
    <label style="padding-left: 1em">
      <input type="radio" name="taxYear" value="2022" checked />
      <strong>2022</strong>
    </label>
  </div>

  <fieldset>
    <legend style="margin-left: auto">
      Calculate Amounts for: <input type='text' name='amount' /> TRY
    </legend>
    <table style="text-align: right">
      <thead>
        <tr style="text-align: center">
          <th colspan="3">
            Tax Rate Breakpoints
          </th>
          <th colspan="2">
            Amounts Subject to this Breakpoint
          </th>
        </tr>
        <tr>
          <th>Min. Amount</th>
          <th>Max. Amount</th>
          <th>Tax Rate</th>
          <th>Income</th>
          <th>Tax</th>
        </tr>
      </thead>
      <tbody>
      </tbody>
      <tfoot>
        <tr>
          <th colspan="3">Total Income:</th>
          <th>
            <strong data-result="total-income"></strong>
          </th>
          <th></th>
        </tr>
        <tr>
          <th colspan="3">Total Tax:</th>
          <th>
            <strong data-result="total-tax"></strong>
          </th>
          <th style="text-align: left; padding-left: .5em">
            <span data-result="effective-tax-rate"></span>
          </th>
        </tr>
        <tr>
          <th colspan="3">Net Income:</th>
          <th>
            <span data-result="net-income"></span>
          </th>
          <th></th>
        </tr>
      </tfoot>
    </table>
  </fieldset>
</form>

<script type="text/javascript">
  var TaxRateBreakpointsByYear = {
    2022: [
      {min: 0, max: 32000, rate: .15},
      {min: 32000, max: 70000, rate: .20},
      {min: 70000, max: 170000, rate: .27},
      {min: 170000, max: 880000, rate: .35},
      {min: 880000, max: Infinity, rate: .4}
    ]
  };

  function formatAmount(amount, currency) {
    if (amount >= Infinity || amount <= -Infinity) {
      return '-';
    }

    currency = currency || 'TRY';
    return Intl.NumberFormat('tr-TR', {style: 'decimal', minimumFractionDigits: 0, maximumFractionDigits: 0}).format(amount) + ' ' + currency;
  }

  function generateAllBreakpointLabels() {
    Object.keys(TaxRateBreakpointsByYear).forEach(function(year) {
      var breakpoints = TaxRateBreakpointsByYear[year];
      breakpoints.forEach(function(breakpoint) {
        breakpoint.labels = [
          formatAmount(breakpoint.min),
          formatAmount(breakpoint.max),
          formatPercentage(breakpoint.rate)
        ];
      });
    });
  }

  function formatPercentage(rate) {
    return '%' + parseInt(100 * rate);
  }

  function init(form) {
    var table = form.querySelector('table');
    var tbody = table.querySelector('tbody');
    var tfoot = table.querySelector('tfoot');

    var selectedYear;
    var selectedBreakpoints = [];

    var lastAmount = 0;

    function refreshSelectedBreakpoints(year) {
      selectedYear = year;
      selectedBreakpoints = TaxRateBreakpointsByYear[year] || [];
    }

    function renderBaseBreakpoints() {
      tbody.innerHTML = '';

      selectedBreakpoints.forEach(function(breakpoint) {
          var row = document.createElement('tr');

          breakpoint.labels.concat().forEach(function(label) {
            var cell = document.createElement('td');
            cell.innerText = label;
            row.appendChild(cell);
          });

          ['applicable-amount', 'tax-amount'].forEach(function(key) {
            var cell = document.createElement('td');
            cell.setAttribute('data-result', key);
            row.appendChild(cell);
          });

          tbody.appendChild(row);
      });
    }

    function renderCalculatedAmounts(amount) {
      if (amount === lastAmount || isNaN(amount) || amount <= 0) {
        return;
      }

      lastAmount = amount;

      var remaining = amount;
      var totalTax = 0;

      var entries = selectedBreakpoints.map(function(breakpoint) {
        var breakpointTaxLimit = breakpoint.max - breakpoint.min;
        var applicableAmount = Math.min(remaining, breakpointTaxLimit);
        var taxAmount = applicableAmount * breakpoint.rate;

        remaining = Math.max(remaining - applicableAmount);
        totalTax += taxAmount;

        return {
          applicableAmount: applicableAmount,
          taxAmount: taxAmount
        }
      });

      entries.forEach(function(entry, idx) {
        var row = tbody.children[idx];

        var applicableAmount = entry.applicableAmount <= 0 ? '-' : formatAmount(entry.applicableAmount);
        row.querySelector('[data-result="applicable-amount"]').innerText = applicableAmount;

        var taxAmount = entry.taxAmount <= 0 ? '-' : formatAmount(entry.taxAmount);
        row.querySelector('[data-result="tax-amount"]').innerText = taxAmount;
      });

      tfoot.querySelector('[data-result="total-income"]').innerText = formatAmount(amount);
      tfoot.querySelector('[data-result="total-tax"]').innerText = formatAmount(totalTax);

      tfoot.querySelector('[data-result="net-income"]').innerText = formatAmount(amount - totalTax);
      tfoot.querySelector('[data-result="effective-tax-rate"]').innerText = '(~' + formatPercentage(totalTax / amount) + ' effective)';
    }

    form.elements.taxYear.addEventListener('change', function(e) {
      refreshSelectedBreakpoints(e.target.value);
    });

    form.elements.amount.addEventListener('keyup', function(e) {
      renderCalculatedAmounts(e.target.value);
    });

    form.elements.amount.addEventListener('blur', function(e) {
      renderCalculatedAmounts(e.target.value);
    });

    form.addEventListener('submit', function(e) {
      e.preventDefault();
    });

    refreshSelectedBreakpoints(2022);
    renderBaseBreakpoints();
  }

  generateAllBreakpointLabels();
  init(document.getElementById('calculator'));
</script>
