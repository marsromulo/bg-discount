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
    *  minimum_order: number
    *  variant_ids: Array
    * }}
    */
    const configuration = JSON.parse(
      input?.discountNode?.metafield?.value ?? "{}"
    );
    
    // if ((!configuration.quantity && !configuration.percentage) || (!configuration.quantity && !configuration.value)) {
    //   return EMPTY_DISCOUNT;
    // }


    let free_item_amount = 0;
    let discount_type = "";

    input.cart.lines.map((line)=> {
      if (line.merchandise.__typename == "ProductVariant" && configuration.variant_ids.includes(line.merchandise.id) ){

        if (line.quantity == 1){
          discount_type = "percent"
        } else if (line.quantity > 1){
          discount_type = "value"
          free_item_amount = line.cost.amountPerQuantity.amount
        }
      }
      
    });

    

    let targets= input.cart.lines
      .filter(line => 
        line.merchandise.__typename == "ProductVariant" &&  configuration.variant_ids.includes(line.merchandise.id)
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
          amount: (Math.round(free_item_amount * 100) / 100).toFixed(2) 
        }
      }
  
      const discount_percentage = {
        percentage: {
          value: configuration.percentage.toString()
        }
      }

      

      //if (input?.cart?.cost?.subtotalAmount?.amount > configuration.minimum_order && targets.length > 0) {
       //discounted_count++
      //}

      if (input?.cart?.cost?.subtotalAmount?.amount > configuration.minimum_order ) {

      return {
        discounts: [
          {
            targets,
            value: discount_type == "percent" ? discount_percentage : discount_value
          }
        ],
        discountApplicationStrategy: DiscountApplicationStrategy.Maximum
      };

  }

  return EMPTY_DISCOUNT;

  };
