// @ts-check
import { DiscountApplicationStrategy } from "../generated/api";


/**
* @typedef {import("../generated/api").InputQuery} InputQuery
* @typedef {import("../generated/api").FunctionResult} FunctionResult
* @typedef {import("../generated/api").Target} Target
* @typedef {import("../generated/api").ProductVariant} ProductVariant
*/

/**
* @type {FunctionResult}
*/
const EMPTY_DISCOUNT = {
  discountApplicationStrategy: DiscountApplicationStrategy.Maximum,
  discounts: [],
};


export default /**
* @param {InputQuery} input
* @returns {FunctionResult}
*/
  (input) => {
    // Define a type for your configuration, and parse it from the metafield
    /**
    * @type {{
    *  quantity: number
    *  percentage: number
    *  value: number
    *  variant_ids: Array
    * }}
    */
    const configuration = JSON.parse(
      input?.discountNode?.metafield?.value ?? "{}"
    );
    if ((!configuration.quantity && !configuration.percentage) || (!configuration.quantity && !configuration.value)) {
      return EMPTY_DISCOUNT;
    }

    let targets= input.cart.lines
      .filter(line => 
       line.quantity >= configuration.quantity && line.merchandise.__typename == "ProductVariant" &&  configuration.variant_ids.includes(line.merchandise.id)
        )
      .map( line  => {

        const variant = /** @type {ProductVariant} */ (line.merchandise);  
        return /** @type {Target} */ ({
          productVariant: {
            id: variant.id
          }
        });
      });

      const discount_value = {
        fixedAmount: {
          amount: (Math.round(configuration.value * 100) / 100).toFixed(2) 
        }
      }
  
      const discount_percentage = {
        percentage: {
          value: configuration.percentage.toString()
        }
      }

    return {
      discounts: [
        {
          targets,
          value: configuration.percentage ? discount_percentage : discount_value
        }
      ],
      discountApplicationStrategy: DiscountApplicationStrategy.Maximum
    };
  };
