<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class RawMaterial extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'unit',
        'stock',
        'minimum_stock',
        'cost_per_unit',
        'is_active',
    ];

    public function recipes(): HasMany
    {
        return $this->hasMany(ProductRecipe::class);
    }

    public function movements(): HasMany
    {
        return $this->hasMany(RawMaterialMovement::class);
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'stock' => 'decimal:3',
            'minimum_stock' => 'decimal:3',
            'cost_per_unit' => 'decimal:2',
            'is_active' => 'boolean',
        ];
    }
}
