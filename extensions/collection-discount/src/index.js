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
    * }}
    */
    const configuration = JSON.parse(
      input?.discountNode?.metafield?.value ?? "{}"
    );
    if ((!configuration.quantity && !configuration.percentage) || (!configuration.quantity && !configuration.value)) {
      return EMPTY_DISCOUNT;
    }

    // const hasAnyTag = input?.cart?.buyerIdentity?.customer?.hasAnyTag ?? false;
    // if (!hasAnyTag) {
    //   console.error("Customer doesn't have any tag.");
    //   return EMPTY_DISCOUNT;
    // }

    let minimum_item_count =0;
    input.cart.lines.map((line)=> {
      if (line.merchandise.__typename == "ProductVariant" &&  line.merchandise.product.inAnyCollection === true  ){
        minimum_item_count++;
      }
    });
    
    

    const targets= input.cart.lines
        .filter(line => line.merchandise.__typename == "ProductVariant" &&  
          line.merchandise.product.inAnyCollection === true  && 
          minimum_item_count >= configuration.quantity 
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

      console.error("value:"+configuration.percentage ? "percent" : "value");
     
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
