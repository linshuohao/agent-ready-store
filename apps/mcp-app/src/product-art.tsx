import { illustration } from '@store/commerce-ui';
import earbuds from '../../web/public/illustrations/earbuds.svg?raw';
import headphones from '../../web/public/illustrations/headphones.svg?raw';
import bottle from '../../web/public/illustrations/bottle.svg?raw';
import charger from '../../web/public/illustrations/charger.svg?raw';
import packet from '../../web/public/illustrations/packet.svg?raw';
import object from '../../web/public/illustrations/object.svg?raw';
const artwork = { earbuds, headphones, bottle, charger, packet, object };
export function ProductArt({ id }: { id: string }) {
  return (
    <figure className="product-art">
      {/* Trusted local SVG assets are bundled into the card, without external requests. */}
      <div
        role="img"
        aria-label={`${id} 商品示意，非實物照片`}
        dangerouslySetInnerHTML={{ __html: artwork[illustration(id)] }}
      />
      <figcaption>商品示意 · {id}，非實物照片</figcaption>
    </figure>
  );
}
