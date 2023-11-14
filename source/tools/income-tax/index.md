title: Income Tax Calculator
layout: tool
activeMenuItem: tools
pageType: page
---
You can use this tool to calculate the income tax for any given amount.

> Note: These rates are specific to Turkey.

---
<style>
  .radio-group > label + label {
    margin-left: 1em;
  }

  [data-table="input"] {
    table-layout: "fixed";
  }

  [data-table="input"] tbody th,
  [data-table="input"] tfoot th {
    text-align: right;
    padding-right: 1em;
    width: 30%;
  }

  [data-table="input"] tbody td {
    padding-left: 1em;
  }
</style>

<form action="/" id="calculator">
  <h4>Input</h4>
  <table data-table="input">
    <tbody>
      <tr>
        <th>Tax Year</th>
        <td class="radio-group">
          <label>
            <input type="radio" name="taxYear" value="2023" checked />
            <strong>2023</strong>
          </label>
          <label>
            <input type="radio" name="taxYear" value="2022" />
            <strong>2022</strong>
          </label>
          <label>
            <input type="radio" name="taxYear" value="2021" />
            <strong>2021</strong>
          </label>
        </td>
      </tr>
      <tr>
        <th>
          <label for="in-amount">
            Total Income
          </label>
        </th>
        <td>
          <input id="in-amount" type="text" name="amount" /> <strong style="margin-left: .5em">TRY</strong>
        </td>
      </tr>
      <tr>
        <th>
          <label for="in-expenses">
            Tax-Deductible Expenses
          </label>
        </th>
        <td>
          <input id="in-expenses" type="text" name="expenses" value="0" /> <strong style="margin-left: .5em">TRY</strong>
        </td>
      </tr>
      <tr>
        <th>Tax Exemptions</th>
        <td>
          <div>
            <label>
              <input type="checkbox" name="exemptExportSoftware" value="1" checked />
              <strong>Eligible as a Software Exporter - 50%</strong>
            </label>
          </div>
          <div>
            <label>
              <input type="checkbox" name="exemptUnder29" value="1" />
              <strong>Under 29 years of age - 75.000 TRY</strong>
            </label>
          </div>
        </td>
      </tr>
    </tbody>
    <tfoot style="border-top: 1px solid #ccc">
    </tfoot>
  </table>

  <h4>Calculation Results</h4>
  <table style="text-align: right; margin-top: 2em" data-table="results">
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
      <tr style="border-top: 1px solid #ccc">
        <th colspan="3">Total Income:</th>
        <th>
          <strong data-result="total-income"></strong>
        </th>
        <th></th>
      </tr>
      <tr style="border-top: 1px solid #ccc">
        <th colspan="3">Total Tax:</th>
        <th>
          <strong data-result="total-tax"></strong>
        </th>
        <th style="text-align: left; padding-left: .5em">
          <span data-result="effective-tax-rate"></span>
        </th>
      </tr>
      <tr>
        <th colspan="3">Bag-Kur Expenses:</th>
        <th>
          <strong data-result="bagkur-amount"></strong>
        </th>
      </tr>
      <tr style="border-top: 1px solid #ccc">
        <th colspan="3">Net Income:</th>
        <th>
          <span data-result="net-income"></span>
        </th>
        <th></th>
      </tr>
      <tr>
        <th colspan="3">Net Income (Monthly):</th>
        <th>
          <span data-result="net-income-monthly"></span>
        </th>
        <th></th>
      </tr>
    </tfoot>
  </table>
</form>

<script type="text/javascript" src="/tools/income-tax/main.js" />
