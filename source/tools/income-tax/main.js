var TaxRateBreakpointsByYear = {
  2022: [
    {min: 0, max: 32000, rate: .15},
    {min: 32000, max: 70000, rate: .20},
    {min: 70000, max: 170000, rate: .27},
    {min: 170000, max: 880000, rate: .35},
    {min: 880000, max: Infinity, rate: .4}
  ],
  2023: [
    {min: 0, max: 70000, rate: .15},
    {min: 70000, max: 150000, rate: .20},
    {min: 150000, max: 370000, rate: .27},
    {min: 370000, max: 1900000, rate: .35},
    {min: 1900000, max: Infinity, rate: .4}
  ],
  2024: [
    {min: 0, max: 110000, rate: .15},
    {min: 110000, max: 230000, rate: .20},
    {min: 230000, max: 580000, rate: .27},
    {min: 580000, max: 3000000, rate: .35},
    {min: 3000000, max: Infinity, rate: .4}
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

  var netIncome = income - totalTax;
  var effectiveTaxRate = totalTax / income;

  return {
    taxYear: taxYear,
    taxBreakpoints: taxBreakpoints,
    income: income,
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

    resultsFooter.querySelector('[data-result="net-income"]').innerText = formatAmount(result.netIncome);
    resultsFooter.querySelector('[data-result="net-income-monthly"]').innerText = formatAmount(result.netIncome / 12);
  }

  ['amount', 'expenses'].forEach(function(key) {
    form.elements[key].addEventListener('keyup', rerender);
    form.elements[key].addEventListener('blur', rerender);
  });

  form.addEventListener('change', rerender);

  form.addEventListener('submit', function(e) {
    e.preventDefault();
  });

  rerender();
}

generateAllBreakpointLabels();
init(document.getElementById('calculator'));
