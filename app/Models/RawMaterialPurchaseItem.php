<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RawMaterialPurchaseItem extends Model
{
    protected $fillable = [
        'raw_material_purchase_id',
        'raw_material_id',
        'raw_material_name',
        'unit',
        'qty',
        'unit_cost',
        'subtotal',
    ];

    public function purchase(): BelongsTo
    {
        return $this->belongsTo(RawMaterialPurchase::class, 'raw_material_purchase_id');
    }

    public function rawMaterial(): BelongsTo
    {
        return $this->belongsTo(RawMaterial::class);
    }

    protected function casts(): array
    {
        return [
            'qty' => 'decimal:3',
            'unit_cost' => 'decimal:2',
            'subtotal' => 'decimal:2',
        ];
    }
}
