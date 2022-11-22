var TaxRateBreakpointsByYear = {
  2021: [
    {min: 0, max: 24000, rate: .15},
    {min: 24000, max: 53000, rate: .2},
    {min: 53000, max: 190000, rate: .27},
    {min: 190000, max: 650000, rate: .35},
    {min: 650000, max: Infinity, rate: .4},
  ],
  2022: [
    {min: 0, max: 32000, rate: .15},
    {min: 32000, max: 70000, rate: .20},
    {min: 70000, max: 170000, rate: .27},
    {min: 170000, max: 880000, rate: .35},
    {min: 880000, max: Infinity, rate: .4}
  ],
  2023: [
    {min: 0, max: 71337, rate: .15},
    {min: 71337, max: 156061, rate: .20},
    {min: 156061, max: 378981, rate: .27},
    {min: 378981, max: 1961784, rate: .35},
    {min: 1961784, max: Infinity, rate: .4}
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

function runCalculationModel(input) {
  var taxYear = input.taxYear;
  var taxBreakpoints = TaxRateBreakpointsByYear[taxYear];
  var income = input.income;
  var expenses = isNaN(input.expenses) ? 0 : Number(input.expenses);
  var exemptExportSoftware = !!input.exemptExportSoftware;
  var exemptUnder29 = !!input.exemptUnder29;
  var bagkurAmount = exemptUnder29 || isNaN(input.bagkurLevel) ? 0 : Number(input.bagkurLevel) * 12660;

  var inputBreakdown = [
    {label: 'Base Taxables (Income)', value: income}
  ];

  var taxableAmount = income;

  if (expenses > 0) {
    taxableAmount -= expenses;
    inputBreakdown.push({
      label: 'Deduction (Expenses)',
      value: -expenses
    });
  }

  if (exemptExportSoftware) {
    var deduction = taxableAmount / 2;
    taxableAmount = deduction;
    inputBreakdown.push({
      label: 'Deduction (Software Exporter)',
      value: -deduction
    });
  }

  if (exemptUnder29) {
    var deduction = Math.min(taxableAmount, 75000);
    taxableAmount = Math.max(0, taxableAmount - 75000);
    inputBreakdown.push({
      label: 'Deduction (Aged Under 29)',
      value: -deduction
    });
  }

  inputBreakdown.push({label: 'Total Deduction', value: income - taxableAmount});
  inputBreakdown.push({label: 'Total Taxables', value: taxableAmount});

  var remaining = taxableAmount;
  var totalTax = 0;

  var outputBreakdown = taxBreakpoints.map(function(breakpoint) {
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

  var netIncome = income - totalTax - bagkurAmount;
  var effectiveTaxRate = totalTax / income;

  return {
    taxYear: taxYear,
    taxBreakpoints: taxBreakpoints,
    income: income,
    bagkurAmount: bagkurAmount,
    inputBreakdown: inputBreakdown,
    totalTax: totalTax,
    expenses: expenses,
    netIncome: netIncome,
    effectiveTaxRate: effectiveTaxRate,
    outputBreakdown: outputBreakdown
  };
}

function init(form) {
  var inputTable = form.querySelector('[data-table="input"]')
  var inputFooter = inputTable.querySelector('tfoot');

  var resultsTable = form.querySelector('[data-table="results"]');
  var resultsBody = resultsTable.querySelector('tbody');
  var resultsFooter = resultsTable.querySelector('tfoot');

  function rerender() {
    var input = {
      taxYear: form.elements.taxYear.value,
      income: form.elements.amount.value,
      expenses: form.elements.expenses.value,
      exemptExportSoftware: form.elements.exemptExportSoftware.checked,
      exemptUnder29: form.elements.exemptUnder29.checked,
      bagkurLevel: form.elements.bagkurLevel.value
    };

    if (isNaN(input.income)) {
      return;
    }

    var result = runCalculationModel(input);

    // INPUT BREAKDOWN
    inputFooter.innerHTML = '';
    result.inputBreakdown
      .forEach(function(breakdown) {
        var row = document.createElement('tr');
        row.innerHTML = '<th>' + breakdown.label + '</th><td>' + formatAmount(breakdown.value) + '</td>';
        inputFooter.appendChild(row);
      });

    // BREAKPOINTS
    resultsBody.innerHTML = '';
    result.taxBreakpoints
      .forEach(function(breakpoint) {
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

        resultsBody.appendChild(row);
      });

    // OUTPUT BREAKDOWN
    result.outputBreakdown
      .forEach(function(entry, idx) {
        var row = resultsBody.children[idx];

        var applicableAmount = entry.applicableAmount <= 0 ? '-' : formatAmount(entry.applicableAmount);
        row.querySelector('[data-result="applicable-amount"]').innerText = applicableAmount;

        var taxAmount = entry.taxAmount <= 0 ? '-' : formatAmount(entry.taxAmount);
        row.querySelector('[data-result="tax-amount"]').innerText = taxAmount;
      });

    resultsFooter.querySelector('[data-result="total-income"]').innerText = formatAmount(result.income);

    resultsFooter.querySelector('[data-result="total-tax"]').innerText = formatAmount(-result.totalTax);
    resultsFooter.querySelector('[data-result="effective-tax-rate"]').innerText = '(~' + formatPercentage(result.effectiveTaxRate) + ' effective)';
    resultsFooter.querySelector('[data-result="bagkur-amount"]').innerText = result.bagkurAmount > 0 ? formatAmount(-result.bagkurAmount) : '-';

    resultsFooter.querySelector('[data-result="net-income"]').innerText = formatAmount(result.netIncome);
    resultsFooter.querySelector('[data-result="net-income-monthly"]').innerText = formatAmount(result.netIncome / 12);
  }

  ['amount', 'expenses'].forEach(function(key) {
    form.elements[key].addEventListener('keyup', rerender);
    form.elements[key].addEventListener('blur', rerender);
  });

  form.addEventListener('change', rerender);

  form.elements.bagkurLevel.addEventListener('change', function(e) {
    var label = 'None';
    if (Number(e.target.value) > 0) {
      label = e.target.value + ' (' + formatAmount(e.target.value * 12660) + ' annually)';
    }

    Array.prototype.slice.call(e.target.labels).forEach(function(el) {
      el.innerHTML = '<strong>' + label + '</strong>';
    });
  });

  form.elements.exemptUnder29.addEventListener('change', function(e) {
    inputTable.querySelector('[data-input="bagkurLevel"]').style.display = e.target.checked ? 'none' : null;
  });

  form.addEventListener('submit', function(e) {
    e.preventDefault();
  });

  rerender();
}

generateAllBreakpointLabels();
init(document.getElementById('calculator'));
